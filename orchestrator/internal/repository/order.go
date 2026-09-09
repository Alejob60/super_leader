package repository

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/superleader/orchestrator/internal/domain"
)

type OrderRepository struct {
	db *sql.DB
}

func NewOrderRepository(db *sql.DB) *OrderRepository {
	return &OrderRepository{db: db}
}

func (r *OrderRepository) Create(order *domain.Order) error {
	query := `
		INSERT INTO orders (id, idempotency_key, status, plate, vehicle_year, city_code, document_id, correlation_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING created_at, updated_at`
	
	return r.db.QueryRow(query,
		order.ID, order.IdempotencyKey, order.Status,
		order.Plate, order.VehicleYear, order.CityCode, order.DocumentID,
		order.CorrelationID,
	).Scan(&order.CreatedAt, &order.UpdatedAt)
}

func (r *OrderRepository) FindByID(id string) (*domain.Order, error) {
	query := `
		SELECT id, idempotency_key, status, plate, vehicle_year, city_code, document_id,
			   COALESCE(quote_id, ''), COALESCE(premium, 0), COALESCE(currency, 'COP'), 
			   valid_until, COALESCE(payment_id, ''), COALESCE(payment_status, ''),
			   COALESCE(policy_number, ''), COALESCE(external_ref, ''), correlation_id, 
			   created_at, updated_at, last_retry_at, retry_count
		FROM orders WHERE id = $1`
	
	order := &domain.Order{}
	var validUntil, lastRetryAt sql.NullTime
	
	err := r.db.QueryRow(query, id).Scan(
		&order.ID, &order.IdempotencyKey, &order.Status,
		&order.Plate, &order.VehicleYear, &order.CityCode, &order.DocumentID,
		&order.QuoteID, &order.Premium, &order.Currency, &validUntil,
		&order.PaymentID, &order.PaymentStatus,
		&order.PolicyNumber, &order.ExternalRef, &order.CorrelationID,
		&order.CreatedAt, &order.UpdatedAt,
		&lastRetryAt, &order.RetryCount,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("order not found: %s", id)
		}
		return nil, err
	}
	
	if validUntil.Valid {
		order.ValidUntil = &validUntil.Time
	}
	if lastRetryAt.Valid {
		order.LastRetryAt = &lastRetryAt.Time
	}
	
	return order, nil
}

func (r *OrderRepository) FindByIdempotencyKey(key string) (*domain.Order, error) {
	query := `SELECT id FROM orders WHERE idempotency_key = $1`
	var id string
	err := r.db.QueryRow(query, key).Scan(&id)
	if err != nil {
		return nil, err
	}
	return r.FindByID(id)
}

func (r *OrderRepository) ListAll(status, search string, limit, offset int) ([]domain.Order, int, error) {
	countQuery := "SELECT COUNT(*) FROM orders WHERE 1=1"
	query := `
		SELECT id, idempotency_key, status, plate, vehicle_year, city_code, document_id,
			   COALESCE(quote_id, ''), COALESCE(premium, 0), COALESCE(currency, 'COP'), 
			   valid_until, COALESCE(payment_id, ''), COALESCE(payment_status, ''),
			   COALESCE(policy_number, ''), COALESCE(external_ref, ''), correlation_id, 
			   created_at, updated_at, last_retry_at, retry_count
		FROM orders WHERE 1=1`
	
	args := []interface{}{}
	argIdx := 1

	if status != "" {
		countQuery += fmt.Sprintf(" AND status = $%d", argIdx)
		query += fmt.Sprintf(" AND status = $%d", argIdx)
		args = append(args, status)
		argIdx++
	}
	if search != "" {
		countQuery += fmt.Sprintf(" AND (plate ILIKE $%d OR document_id ILIKE $%d OR id::text ILIKE $%d)", argIdx, argIdx, argIdx)
		query += fmt.Sprintf(" AND (plate ILIKE $%d OR document_id ILIKE $%d OR id::text ILIKE $%d)", argIdx, argIdx, argIdx)
		args = append(args, "%"+search+"%")
		argIdx++
	}

	var total int
	if err := r.db.QueryRow(countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	query += " ORDER BY created_at DESC"
	if limit > 0 {
		query += fmt.Sprintf(" LIMIT $%d", argIdx)
		args = append(args, limit)
		argIdx++
	}
	if offset > 0 {
		query += fmt.Sprintf(" OFFSET $%d", argIdx)
		args = append(args, offset)
		argIdx++
	}

	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var orders []domain.Order
	for rows.Next() {
		var o domain.Order
		var validUntil, lastRetryAt sql.NullTime
		err := rows.Scan(
			&o.ID, &o.IdempotencyKey, &o.Status,
			&o.Plate, &o.VehicleYear, &o.CityCode, &o.DocumentID,
			&o.QuoteID, &o.Premium, &o.Currency, &validUntil,
			&o.PaymentID, &o.PaymentStatus,
			&o.PolicyNumber, &o.ExternalRef, &o.CorrelationID,
			&o.CreatedAt, &o.UpdatedAt,
			&lastRetryAt, &o.RetryCount,
		)
		if err != nil {
			return nil, 0, err
		}
		if validUntil.Valid {
			o.ValidUntil = &validUntil.Time
		}
		if lastRetryAt.Valid {
			o.LastRetryAt = &lastRetryAt.Time
		}
		orders = append(orders, o)
	}
	return orders, total, nil
}

func (r *OrderRepository) UpdateStatus(id string, status domain.OrderStatus) error {
	query := `UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2`
	_, err := r.db.Exec(query, status, id)
	return err
}

func (r *OrderRepository) UpdatePayment(id string, paymentID string, status string) error {
	query := `UPDATE orders SET payment_id = $1, payment_status = $2, updated_at = NOW() WHERE id = $3`
	_, err := r.db.Exec(query, paymentID, status, id)
	return err
}

func (r *OrderRepository) UpdateIssuing(id string, policyNumber string, externalRef string) error {
	query := `UPDATE orders SET policy_number = $1, external_ref = $2, updated_at = NOW() WHERE id = $3`
	_, err := r.db.Exec(query, policyNumber, externalRef, id)
	return err
}

func (r *OrderRepository) FindOrdersByPaymentID(paymentID string) ([]domain.Order, error) {
	query := `
		SELECT id, idempotency_key, status, plate, vehicle_year, city_code, document_id,
			   COALESCE(quote_id, ''), COALESCE(premium, 0), COALESCE(currency, 'COP'), 
			   valid_until, COALESCE(payment_id, ''), COALESCE(payment_status, ''),
			   COALESCE(policy_number, ''), COALESCE(external_ref, ''), correlation_id, 
			   created_at, updated_at, last_retry_at, retry_count
		FROM orders WHERE payment_id = $1`
	
	rows, err := r.db.Query(query, paymentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	var orders []domain.Order
	for rows.Next() {
		var o domain.Order
		var validUntil, lastRetryAt sql.NullTime
		err := rows.Scan(
			&o.ID, &o.IdempotencyKey, &o.Status,
			&o.Plate, &o.VehicleYear, &o.CityCode, &o.DocumentID,
			&o.QuoteID, &o.Premium, &o.Currency, &validUntil,
			&o.PaymentID, &o.PaymentStatus,
			&o.PolicyNumber, &o.ExternalRef, &o.CorrelationID,
			&o.CreatedAt, &o.UpdatedAt,
			&lastRetryAt, &o.RetryCount,
		)
		if err != nil {
			return nil, err
		}
		if validUntil.Valid {
			o.ValidUntil = &validUntil.Time
		}
		if lastRetryAt.Valid {
			o.LastRetryAt = &lastRetryAt.Time
		}
		orders = append(orders, o)
	}
	return orders, nil
}

func (r *OrderRepository) FindStuckOrders(threshold time.Duration) ([]domain.Order, error) {
	query := `
		SELECT id, idempotency_key, status, plate, vehicle_year, city_code, document_id,
			   correlation_id, created_at, updated_at, retry_count
		FROM orders 
		WHERE status IN ('PAYMENT_PENDING', 'ISSUING')
		AND updated_at < NOW() - $1::INTERVAL
		ORDER BY updated_at ASC`
	
	rows, err := r.db.Query(query, fmt.Sprintf("%d seconds", int(threshold.Seconds())))
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	var orders []domain.Order
	for rows.Next() {
		var o domain.Order
		err := rows.Scan(
			&o.ID, &o.IdempotencyKey, &o.Status,
			&o.Plate, &o.VehicleYear, &o.CityCode, &o.DocumentID,
			&o.CorrelationID, &o.CreatedAt, &o.UpdatedAt, &o.RetryCount,
		)
		if err != nil {
			return nil, err
		}
		orders = append(orders, o)
	}
	return orders, nil
}

func (r *OrderRepository) FindByExternalRef(externalRef string) (*domain.Order, error) {
	query := `SELECT id FROM orders WHERE external_ref = $1`
	var id string
	err := r.db.QueryRow(query, externalRef).Scan(&id)
	if err != nil {
		return nil, err
	}
	return r.FindByID(id)
}

type OutboxEvent struct {
	ID          string    `json:"id"`
	AggregateID string    `json:"aggregate_id"`
	EventType   string    `json:"event_type"`
	Payload     []byte    `json:"payload"`
	Published   bool      `json:"published"`
	CreatedAt   time.Time `json:"created_at"`
}

func (r *OrderRepository) SaveOutboxEvent(event *OutboxEvent) error {
	query := `
		INSERT INTO outbox_events (id, aggregate_id, event_type, payload)
		VALUES ($1, $2, $3, $4)`
	_, err := r.db.Exec(query, event.ID, event.AggregateID, event.EventType, event.Payload)
	return err
}

func (r *OrderRepository) GetUnpublishedEvents(limit int) ([]OutboxEvent, error) {
	query := `
		SELECT id, aggregate_id, event_type, payload, created_at
		FROM outbox_events 
		WHERE published = FALSE 
		ORDER BY created_at ASC 
		LIMIT $1`
	
	rows, err := r.db.Query(query, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	var events []OutboxEvent
	for rows.Next() {
		var e OutboxEvent
		err := rows.Scan(&e.ID, &e.AggregateID, &e.EventType, &e.Payload, &e.CreatedAt)
		if err != nil {
			return nil, err
		}
		events = append(events, e)
	}
	return events, nil
}

func (r *OrderRepository) MarkEventPublished(id string) error {
	query := `UPDATE outbox_events SET published = TRUE, published_at = NOW() WHERE id = $1`
	_, err := r.db.Exec(query, id)
	return err
}

type DeadLetterMessage struct {
	ID           string    `json:"id"`
	OrderID      string    `json:"order_id"`
	EventType    string    `json:"event_type"`
	Payload      []byte    `json:"payload"`
	ErrorMessage string    `json:"error_message"`
	RetryCount   int       `json:"retry_count"`
	MaxRetries   int       `json:"max_retries"`
	CreatedAt    time.Time `json:"created_at"`
	NextRetryAt  time.Time `json:"next_retry_at"`
}

func (r *OrderRepository) SaveToDLQ(msg *DeadLetterMessage) error {
	query := `
		INSERT INTO dead_letter_queue (id, order_id, event_type, payload, error_message, retry_count, max_retries, next_retry_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`
	_, err := r.db.Exec(query, msg.ID, msg.OrderID, msg.EventType, msg.Payload, msg.ErrorMessage, msg.RetryCount, msg.MaxRetries, msg.NextRetryAt)
	return err
}

func (r *OrderRepository) GetRetryableFromDLQ(limit int) ([]DeadLetterMessage, error) {
	query := `
		SELECT id, order_id, event_type, payload, error_message, retry_count, max_retries, created_at, next_retry_at
		FROM dead_letter_queue 
		WHERE retry_count < max_retries AND next_retry_at <= NOW()
		ORDER BY next_retry_at ASC 
		LIMIT $1`
	
	rows, err := r.db.Query(query, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	var messages []DeadLetterMessage
	for rows.Next() {
		var m DeadLetterMessage
		err := rows.Scan(&m.ID, &m.OrderID, &m.EventType, &m.Payload, &m.ErrorMessage, &m.RetryCount, &m.MaxRetries, &m.CreatedAt, &m.NextRetryAt)
		if err != nil {
			return nil, err
		}
		messages = append(messages, m)
	}
	return messages, nil
}

func CreateEventPayload(v interface{}) ([]byte, error) {
	return json.Marshal(v)
}
