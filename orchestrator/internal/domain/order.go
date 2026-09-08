package domain

import (
	"fmt"
	"time"
)

type OrderStatus string

const (
	StatusCreated        OrderStatus = "CREATED"
	StatusQuoted         OrderStatus = "QUOTED"
	StatusPaymentPending OrderStatus = "PAYMENT_PENDING"
	StatusPaid           OrderStatus = "PAID"
	StatusIssuing        OrderStatus = "ISSUING"
	StatusIssued         OrderStatus = "ISSUED"
	StatusPaymentFailed  OrderStatus = "PAYMENT_FAILED"
	StatusIssuingFailed  OrderStatus = "ISSUING_FAILED"
	StatusRefundRequired OrderStatus = "REFUND_REQUIRED"
	StatusCancelled      OrderStatus = "CANCELLED"
)

var validTransitions = map[OrderStatus][]OrderStatus{
	StatusCreated:        {StatusQuoted, StatusCancelled},
	StatusQuoted:         {StatusPaymentPending, StatusCancelled},
	StatusPaymentPending: {StatusPaid, StatusPaymentFailed},
	StatusPaid:           {StatusIssuing, StatusIssuingFailed},
	StatusIssuing:        {StatusIssued, StatusIssuingFailed},
	StatusIssuingFailed:  {StatusIssuing, StatusRefundRequired, StatusCancelled},
	StatusPaymentFailed:  {StatusCancelled},
	StatusRefundRequired: {StatusCancelled},
}

type Order struct {
	ID             string      `json:"id" db:"id"`
	IdempotencyKey string      `json:"idempotency_key" db:"idempotency_key"`
	Status         OrderStatus `json:"status" db:"status"`
	Plate          string      `json:"plate" db:"plate"`
	VehicleYear    int         `json:"vehicle_year" db:"vehicle_year"`
	CityCode       string      `json:"city_code" db:"city_code"`
	DocumentID     string      `json:"document_id" db:"document_id"`
	QuoteID        string      `json:"quote_id,omitempty" db:"quote_id"`
	Premium        float64     `json:"premium,omitempty" db:"premium"`
	Currency       string      `json:"currency" db:"currency"`
	ValidUntil     *time.Time  `json:"valid_until,omitempty" db:"valid_until"`
	PaymentID      string      `json:"payment_id,omitempty" db:"payment_id"`
	PaymentStatus  string      `json:"payment_status,omitempty" db:"payment_status"`
	PolicyNumber   string      `json:"policy_number,omitempty" db:"policy_number"`
	ExternalRef    string      `json:"external_ref,omitempty" db:"external_ref"`
	CorrelationID  string      `json:"correlation_id" db:"correlation_id"`
	CreatedAt      time.Time   `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time   `json:"updated_at" db:"updated_at"`
	LastRetryAt    *time.Time  `json:"last_retry_at,omitempty" db:"last_retry_at"`
	RetryCount     int         `json:"retry_count" db:"retry_count"`
}

type CreateOrderRequest struct {
	Plate       string `json:"plate" binding:"required"`
	VehicleYear int    `json:"vehicle_year" binding:"required"`
	CityCode    string `json:"city_code" binding:"required"`
	DocumentID  string `json:"document_id" binding:"required"`
}

func (o *Order) CanTransitionTo(newStatus OrderStatus) bool {
	allowed, exists := validTransitions[o.Status]
	if !exists {
		return false
	}
	for _, s := range allowed {
		if s == newStatus {
			return true
		}
	}
	return false
}

func (o *Order) TransitionTo(newStatus OrderStatus) error {
	if !o.CanTransitionTo(newStatus) {
		return fmt.Errorf("invalid transition from %s to %s", o.Status, newStatus)
	}
	o.Status = newStatus
	o.UpdatedAt = time.Now()
	return nil
}
