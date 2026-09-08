package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"math/rand"
	"net/http"
	"os"
	"time"

	"github.com/superleader/orchestrator/internal/domain"
)

type QuoteClient struct {
	baseURL    string
	httpClient *http.Client
}

type QuoteRequest struct {
	Plate       string `json:"plate"`
	VehicleYear int    `json:"vehicleYear"`
	CityCode    string `json:"cityCode"`
	DocumentID  string `json:"documentId"`
}

type QuoteData struct {
	QuoteID    string    `json:"quoteId"`
	Premium    float64   `json:"premium"`
	Currency   string    `json:"currency"`
	ValidUntil time.Time `json:"validUntil"`
}

func NewQuoteClient() *QuoteClient {
	return &QuoteClient{
		baseURL: getEnv("QUOTE_SERVICE_URL", "http://simulator:9090"),
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

func (c *QuoteClient) GetQuote(order *domain.Order) (*QuoteData, error) {
	req := QuoteRequest{
		Plate:       order.Plate,
		VehicleYear: order.VehicleYear,
		CityCode:    order.CityCode,
		DocumentID:  order.DocumentID,
	}

	body, _ := json.Marshal(req)
	resp, err := c.httpClient.Post(c.baseURL+"/v1/quotes", "application/json", bytes.NewBuffer(body))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("quote service returned status %d", resp.StatusCode)
	}

	var quote QuoteData
	if err := json.NewDecoder(resp.Body).Decode(&quote); err != nil {
		return nil, err
	}

	return &quote, nil
}

type PaymentClient struct {
	baseURL    string
	httpClient *http.Client
}

type PaymentRequest struct {
	QuoteID     string  `json:"quoteId"`
	Amount      float64 `json:"amount"`
	Currency    string  `json:"currency"`
	CustomerRef string  `json:"customerRef"`
}

type PaymentData struct {
	PaymentID string `json:"paymentId"`
	Status    string `json:"status"`
}

func NewPaymentClient() *PaymentClient {
	return &PaymentClient{
		baseURL: getEnv("PAYMENT_SERVICE_URL", "http://simulator:9090"),
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

func (c *PaymentClient) InitiatePayment(order *domain.Order) (*PaymentData, error) {
	req := PaymentRequest{
		QuoteID:     order.QuoteID,
		Amount:      order.Premium,
		Currency:    order.Currency,
		CustomerRef: order.ID,
	}

	body, _ := json.Marshal(req)
	resp, err := c.httpClient.Post(c.baseURL+"/v1/payments", "application/json", bytes.NewBuffer(body))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusAccepted {
		return nil, fmt.Errorf("payment service returned status %d", resp.StatusCode)
	}

	var payment PaymentData
	if err := json.NewDecoder(resp.Body).Decode(&payment); err != nil {
		return nil, err
	}

	return &payment, nil
}

type IssuerClient struct {
	baseURL    string
	httpClient *http.Client
}

type IssueRequest struct {
	OrderID       string  `json:"orderId"`
	Plate         string  `json:"plate"`
	VehicleYear   int     `json:"vehicleYear"`
	CityCode      string  `json:"cityCode"`
	DocumentID    string  `json:"documentId"`
	Premium       float64 `json:"premium"`
	Currency      string  `json:"currency"`
	QuoteID       string  `json:"quoteId"`
	CorrelationID string  `json:"correlationId"`
}

type PolicyData struct {
	PolicyNumber string `json:"policyNumber"`
	ExternalRef  string `json:"externalRef"`
}

func NewIssuerClient() *IssuerClient {
	return &IssuerClient{
		baseURL: getEnv("ISSUER_SERVICE_URL", "http://simulator:9090"),
		httpClient: &http.Client{
			Timeout: 15 * time.Second,
		},
	}
}

func (c *IssuerClient) IssuePolicy(order *domain.Order) (*PolicyData, error) {
	req := IssueRequest{
		OrderID:       order.ID,
		Plate:         order.Plate,
		VehicleYear:   order.VehicleYear,
		CityCode:      order.CityCode,
		DocumentID:    order.DocumentID,
		Premium:       order.Premium,
		Currency:      order.Currency,
		QuoteID:       order.QuoteID,
		CorrelationID: order.CorrelationID,
	}

	body, _ := json.Marshal(req)
	
	var lastErr error
	for attempt := 0; attempt < 3; attempt++ {
		if attempt > 0 {
			backoff := math.Pow(2, float64(attempt)) * 1000
			jitter := rand.Float64() * 500
			time.Sleep(time.Duration(backoff+jitter) * time.Millisecond)
		}

		resp, err := c.httpClient.Post(c.baseURL+"/issue", "application/json", bytes.NewBuffer(body))
		if err != nil {
			lastErr = err
			continue
		}
		
		respBody, _ := io.ReadAll(resp.Body)
		resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			lastErr = fmt.Errorf("issuer returned status %d: %s", resp.StatusCode, string(respBody))
			continue
		}

		var result map[string]interface{}
		if err := json.Unmarshal(respBody, &result); err != nil {
			lastErr = err
			continue
		}

		if errMsg, ok := result["result"].(string); ok && errMsg == "ERROR" {
			lastErr = fmt.Errorf("issuer business error: %v", result["message"])
			continue
		}

		var policy PolicyData
		if err := json.Unmarshal(respBody, &policy); err != nil {
			lastErr = err
			continue
		}

		return &policy, nil
	}

	return nil, fmt.Errorf("issuer failed after 3 attempts: %v", lastErr)
}

func getEnv(key, defaultValue string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultValue
}
