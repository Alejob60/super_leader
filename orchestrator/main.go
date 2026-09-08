package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	_ "github.com/lib/pq"
	"github.com/superleader/orchestrator/internal/handlers"
	"github.com/superleader/orchestrator/internal/repository"
)

func main() {
	dbURL := getEnv("DATABASE_URL", "postgres://admin:admin123@localhost:5432/super_leader?sslmode=disable")
	
	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("Failed to ping database: %v", err)
	}
	log.Println("Connected to PostgreSQL")

	if err := runMigrations(db); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	repo := repository.NewOrderRepository(db)
	webhookSecret := getEnv("PSP_WEBHOOK_SECRET", "test-secret-hmac")
	
	orderHandler := handlers.NewOrderHandler(repo, webhookSecret)
	webhookHandler := handlers.NewWebhookHandler(repo, webhookSecret)
	reconciliationHandler := handlers.NewReconciliationHandler(repo)
	dlqHandler := handlers.NewDLQHandler(repo)

	go startReconciliationJob(reconciliationHandler)
	go startDLQJob(dlqHandler)

	r := gin.Default()

	r.Use(func(c *gin.Context) {
		correlationID := c.GetHeader("X-Correlation-ID")
		if correlationID == "" {
			correlationID = c.GetHeader("Idempotency-Key")
		}
		if correlationID != "" {
			c.Set("correlation_id", correlationID)
		}
		c.Next()
	})

	r.POST("/orders", orderHandler.CreateOrder)
	r.GET("/orders/:id", orderHandler.GetOrder)
	r.GET("/orders", orderHandler.ListOrders)
	r.POST("/orders/:id/retry-issuing", orderHandler.RetryIssuing)
	r.POST("/orders/:id/mark-refund", orderHandler.MarkForRefund)
	r.POST("/webhooks/payments", webhookHandler.HandlePaymentWebhook)

	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "healthy"})
	})

	port := getEnv("PORT", "8080")
	log.Printf("Orchestrator starting on port %s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

func getEnv(key, defaultValue string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultValue
}

func runMigrations(db *sql.DB) error {
	migrationSQL := `
	DO $$ BEGIN
		CREATE TYPE order_status AS ENUM (
			'CREATED', 'QUOTED', 'PAYMENT_PENDING', 'PAID', 'ISSUING', 'ISSUED',
			'PAYMENT_FAILED', 'ISSUING_FAILED', 'REFUND_REQUIRED', 'CANCELLED'
		);
	EXCEPTION
		WHEN duplicate_object THEN null;
	END $$;

	CREATE TABLE IF NOT EXISTS orders (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		idempotency_key VARCHAR(64) UNIQUE NOT NULL,
		status order_status NOT NULL DEFAULT 'CREATED',
		plate VARCHAR(10) NOT NULL,
		vehicle_year INTEGER NOT NULL,
		city_code VARCHAR(10) NOT NULL,
		document_id VARCHAR(20) NOT NULL,
		quote_id VARCHAR(64),
		premium DECIMAL(10,2),
		currency VARCHAR(3) DEFAULT 'COP',
		valid_until TIMESTAMP,
		payment_id VARCHAR(64),
		payment_status VARCHAR(20),
		policy_number VARCHAR(64),
		external_ref VARCHAR(64),
		correlation_id VARCHAR(64) NOT NULL,
		created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		last_retry_at TIMESTAMP WITH TIME ZONE,
		retry_count INTEGER DEFAULT 0
	);

	CREATE TABLE IF NOT EXISTS outbox_events (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		aggregate_id UUID NOT NULL REFERENCES orders(id),
		event_type VARCHAR(64) NOT NULL,
		payload JSONB NOT NULL,
		published BOOLEAN DEFAULT FALSE,
		created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		published_at TIMESTAMP WITH TIME ZONE
	);

	CREATE TABLE IF NOT EXISTS dead_letter_queue (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		order_id UUID REFERENCES orders(id),
		event_type VARCHAR(64) NOT NULL,
		payload JSONB NOT NULL,
		error_message TEXT,
		retry_count INTEGER DEFAULT 0,
		max_retries INTEGER DEFAULT 5,
		created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		next_retry_at TIMESTAMP WITH TIME ZONE
	);

	CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
	CREATE INDEX IF NOT EXISTS idx_orders_idempotency ON orders(idempotency_key);
	CREATE INDEX IF NOT EXISTS idx_orders_correlation ON orders(correlation_id);
	CREATE INDEX IF NOT EXISTS idx_orders_external_ref ON orders(external_ref);
	CREATE INDEX IF NOT EXISTS idx_outbox_unpublished ON outbox_events(published, created_at);
	CREATE INDEX IF NOT EXISTS idx_dlq_retry ON dead_letter_queue(next_retry_at, retry_count);
	`

	_, err := db.Exec(migrationSQL)
	return err
}

func startReconciliationJob(handler *handlers.ReconciliationHandler) {
	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		log.Println("[RECONCILIATION] Running reconciliation job...")
		handler.ReconcileStuckOrders()
	}
}

func startDLQJob(handler *handlers.DLQHandler) {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		log.Println("[DLQ] Processing dead letter queue...")
		handler.ProcessRetryableMessages()
	}
}

func init() {
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		<-sigChan
		log.Println("Shutting down gracefully...")
		fmt.Println("Orchestrator stopped")
		os.Exit(0)
	}()
}
