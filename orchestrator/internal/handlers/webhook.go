package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/superleader/orchestrator/internal/domain"
	"github.com/superleader/orchestrator/internal/repository"
)

type WebhookHandler struct {
	repo          *repository.OrderRepository
	webhookSecret string
}

func NewWebhookHandler(repo *repository.OrderRepository, secret string) *WebhookHandler {
	return &WebhookHandler{
		repo:          repo,
		webhookSecret: secret,
	}
}

type PaymentWebhook struct {
	PaymentID  string    `json:"paymentId"`
	Status     string    `json:"status"`
	OccurredAt time.Time `json:"occurredAt"`
	Signature  string    `json:"signature"`
}

func (h *WebhookHandler) HandlePaymentWebhook(c *gin.Context) {
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "failed to read body"})
		return
	}

	var webhook PaymentWebhook
	if err := json.Unmarshal(body, &webhook); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid JSON"})
		return
	}

	if !VerifyHMAC(body[:len(body)-len(webhook.Signature)-1], webhook.Signature, h.webhookSecret) {
		log.Printf("[SECURITY] Invalid HMAC signature for payment %s", webhook.PaymentID)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid signature"})
		return
	}

	orders, _ := h.repo.FindStuckOrders(24 * time.Hour)
	var order *domain.Order
	for _, o := range orders {
		if o.PaymentID == webhook.PaymentID {
			order = &o
			break
		}
	}

	if order == nil {
		c.JSON(http.StatusOK, gin.H{"status": "ignored"})
		return
	}

	switch webhook.Status {
	case "APPROVED":
		if order.Status == domain.StatusPaymentPending {
			h.repo.UpdatePayment(order.ID, webhook.PaymentID, "APPROVED")
			h.repo.UpdateStatus(order.ID, domain.StatusPaid)
			go h.triggerIssuing(order)
		}
	case "REJECTED":
		if order.Status == domain.StatusPaymentPending {
			h.repo.UpdatePayment(order.ID, webhook.PaymentID, "REJECTED")
			h.repo.UpdateStatus(order.ID, domain.StatusPaymentFailed)
		}
	case "REFUND_REQUIRED":
		h.repo.UpdateStatus(order.ID, domain.StatusRefundRequired)
	default:
		log.Printf("[WEBHOOK] Unknown status %s for payment %s", webhook.Status, webhook.PaymentID)
	}

	c.JSON(http.StatusOK, gin.H{"status": "processed"})
}

func (h *WebhookHandler) triggerIssuing(order *domain.Order) {
	if err := h.repo.UpdateStatus(order.ID, domain.StatusIssuing); err != nil {
		return
	}

	issuerClient := NewIssuerClient()
	policy, err := issuerClient.IssuePolicy(order)
	if err != nil {
		h.repo.UpdateStatus(order.ID, domain.StatusIssuingFailed)
		return
	}

	h.repo.UpdateIssuing(order.ID, policy.PolicyNumber, policy.ExternalRef)
	h.repo.UpdateStatus(order.ID, domain.StatusIssued)
}

type ReconciliationHandler struct {
	repo *repository.OrderRepository
}

func NewReconciliationHandler(repo *repository.OrderRepository) *ReconciliationHandler {
	return &ReconciliationHandler{repo: repo}
}

func (h *ReconciliationHandler) ReconcileStuckOrders() {
	threshold := 5 * time.Minute
	orders, err := h.repo.FindStuckOrders(threshold)
	if err != nil {
		log.Printf("[RECONCILIATION] Error finding stuck orders: %v", err)
		return
	}

	for _, order := range orders {
		log.Printf("[RECONCILIATION] Processing stuck order %s (status: %s)", order.ID, order.Status)
		h.reconcileOrder(&order)
	}
}

func (h *ReconciliationHandler) reconcileOrder(order *domain.Order) {
	if order.ExternalRef != "" {
		issuerClient := NewIssuerClient()
		policy, err := issuerClient.CheckPolicy(order.ExternalRef)
		if err == nil && policy != nil {
			h.repo.UpdateIssuing(order.ID, policy.PolicyNumber, policy.ExternalRef)
			h.repo.UpdateStatus(order.ID, domain.StatusIssued)
			return
		}
	}

	if order.RetryCount >= 3 {
		h.repo.UpdateStatus(order.ID, domain.StatusIssuingFailed)
		return
	}

	if err := h.repo.UpdateStatus(order.ID, domain.StatusIssuing); err != nil {
		return
	}

	go func() {
		issuerClient := NewIssuerClient()
		policy, err := issuerClient.IssuePolicy(order)
		if err != nil {
			h.repo.UpdateStatus(order.ID, domain.StatusIssuingFailed)
			return
		}
		h.repo.UpdateIssuing(order.ID, policy.PolicyNumber, policy.ExternalRef)
		h.repo.UpdateStatus(order.ID, domain.StatusIssued)
	}()
}

type DLQHandler struct {
	repo *repository.OrderRepository
}

func NewDLQHandler(repo *repository.OrderRepository) *DLQHandler {
	return &DLQHandler{repo: repo}
}

func (h *DLQHandler) ProcessRetryableMessages() {
	messages, err := h.repo.GetRetryableFromDLQ(10)
	if err != nil {
		log.Printf("[DLQ] Error fetching retryable messages: %v", err)
		return
	}

	for _, msg := range messages {
		log.Printf("[DLQ] Retrying message %s for order %s (attempt %d/%d)", msg.ID, msg.OrderID, msg.RetryCount+1, msg.MaxRetries)
		h.retryMessage(&msg)
	}
}

func (h *DLQHandler) retryMessage(msg *repository.DeadLetterMessage) {
	order, err := h.repo.FindByID(msg.OrderID)
	if err != nil {
		return
	}

	issuerClient := NewIssuerClient()
	policy, err := issuerClient.IssuePolicy(order)
	if err != nil {
		msg.RetryCount++
		msg.NextRetryAt = time.Now().Add(time.Duration(1<<uint(msg.RetryCount)) * time.Minute)
		h.repo.SaveToDLQ(msg)
		return
	}

	h.repo.UpdateIssuing(order.ID, policy.PolicyNumber, policy.ExternalRef)
	h.repo.UpdateStatus(order.ID, domain.StatusIssued)
}

func (c *IssuerClient) CheckPolicy(externalRef string) (*PolicyData, error) {
	resp, err := c.httpClient.Get(fmt.Sprintf("%s/policies?externalRef=%s", c.baseURL, externalRef))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("policy not found")
	}

	var policy PolicyData
	if err := json.NewDecoder(resp.Body).Decode(&policy); err != nil {
		return nil, err
	}

	return &policy, nil
}
