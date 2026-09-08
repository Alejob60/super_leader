package handlers

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/superleader/orchestrator/internal/domain"
	"github.com/superleader/orchestrator/internal/repository"
)

type OrderHandler struct {
	repo           *repository.OrderRepository
	webhookSecret  string
	quoteClient    *QuoteClient
	paymentClient  *PaymentClient
	issuerClient   *IssuerClient
}

func NewOrderHandler(repo *repository.OrderRepository, secret string) *OrderHandler {
	return &OrderHandler{
		repo:          repo,
		webhookSecret: secret,
		quoteClient:   NewQuoteClient(),
		paymentClient: NewPaymentClient(),
		issuerClient:  NewIssuerClient(),
	}
}

func (h *OrderHandler) CreateOrder(c *gin.Context) {
	var req domain.CreateOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	idempotencyKey := c.GetHeader("Idempotency-Key")
	if idempotencyKey == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Idempotency-Key header required"})
		return
	}

	existing, _ := h.repo.FindByIdempotencyKey(idempotencyKey)
	if existing != nil {
		c.JSON(http.StatusOK, existing)
		return
	}

	correlationID := uuid.New().String()
	order := &domain.Order{
		ID:             uuid.New().String(),
		IdempotencyKey: idempotencyKey,
		Status:         domain.StatusCreated,
		Plate:          req.Plate,
		VehicleYear:    req.VehicleYear,
		CityCode:       req.CityCode,
		DocumentID:     req.DocumentID,
		CorrelationID:  correlationID,
	}

	if err := h.repo.Create(order); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create order"})
		return
	}

	go h.processOrder(order)

	c.JSON(http.StatusCreated, order)
}

func (h *OrderHandler) processOrder(order *domain.Order) {
	quote, err := h.quoteClient.GetQuote(order)
	if err != nil {
		h.repo.UpdateStatus(order.ID, domain.StatusCancelled)
		return
	}

	order.QuoteID = quote.QuoteID
	order.Premium = quote.Premium
	order.Currency = quote.Currency
	order.ValidUntil = &quote.ValidUntil
	h.repo.UpdateStatus(order.ID, domain.StatusQuoted)

	h.repo.UpdateStatus(order.ID, domain.StatusPaymentPending)
	payment, err := h.paymentClient.InitiatePayment(order)
	if err != nil {
		h.repo.UpdateStatus(order.ID, domain.StatusPaymentFailed)
		return
	}

	order.PaymentID = payment.PaymentID
	h.repo.UpdatePayment(order.ID, payment.PaymentID, "PENDING")
}

func (h *OrderHandler) GetOrder(c *gin.Context) {
	id := c.Param("id")
	order, err := h.repo.FindByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "order not found"})
		return
	}
	c.JSON(http.StatusOK, order)
}

func (h *OrderHandler) ListOrders(c *gin.Context) {
	status := c.Query("status")
	search := c.Query("search")
	_ = status
	_ = search
	c.JSON(http.StatusOK, []domain.Order{})
}

func (h *OrderHandler) RetryIssuing(c *gin.Context) {
	id := c.Param("id")
	order, err := h.repo.FindByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "order not found"})
		return
	}

	if order.Status != domain.StatusIssuingFailed {
		c.JSON(http.StatusBadRequest, gin.H{"error": "order not in ISSUING_FAILED status"})
		return
	}

	if err := h.repo.UpdateStatus(id, domain.StatusIssuing); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update status"})
		return
	}

	go h.issuePolicy(order)

	c.JSON(http.StatusOK, gin.H{"message": "retry initiated"})
}

func (h *OrderHandler) MarkForRefund(c *gin.Context) {
	id := c.Param("id")
	order, err := h.repo.FindByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "order not found"})
		return
	}

	if order.Status != domain.StatusIssuingFailed && order.Status != domain.StatusIssued {
		c.JSON(http.StatusBadRequest, gin.H{"error": "order not in refundable status"})
		return
	}

	if err := h.repo.UpdateStatus(id, domain.StatusRefundRequired); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update status"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "order marked for refund"})
}

func (h *OrderHandler) issuePolicy(order *domain.Order) {
	policy, err := h.issuerClient.IssuePolicy(order)
	if err != nil {
		h.repo.UpdateStatus(order.ID, domain.StatusIssuingFailed)
		return
	}

	if err := h.repo.UpdateIssuing(order.ID, policy.PolicyNumber, policy.ExternalRef); err != nil {
		return
	}
	h.repo.UpdateStatus(order.ID, domain.StatusIssued)
}

type QuoteResponse struct {
	QuoteID    string    `json:"quoteId"`
	Premium    float64   `json:"premium"`
	Currency   string    `json:"currency"`
	ValidUntil time.Time `json:"validUntil"`
}

type PaymentResponse struct {
	PaymentID string `json:"paymentId"`
	Status    string `json:"status"`
}

type PolicyResponse struct {
	PolicyNumber string `json:"policyNumber"`
	ExternalRef  string `json:"externalRef"`
}

func VerifyHMAC(payload []byte, signature string, secret string) bool {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(payload)
	expectedMAC := hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(signature), []byte(expectedMAC))
}
