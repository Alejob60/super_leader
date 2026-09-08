-- Enum para estados de la orden
CREATE TYPE order_status AS ENUM (
    'CREATED',
    'QUOTED',
    'PAYMENT_PENDING',
    'PAID',
    'ISSUING',
    'ISSUED',
    'PAYMENT_FAILED',
    'ISSUING_FAILED',
    'REFUND_REQUIRED',
    'CANCELLED'
);

-- Tabla principal de órdenes
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key VARCHAR(64) UNIQUE NOT NULL,
    status order_status NOT NULL DEFAULT 'CREATED',
    
    -- Datos del vehículo
    plate VARCHAR(10) NOT NULL,
    vehicle_year INTEGER NOT NULL,
    city_code VARCHAR(10) NOT NULL,
    document_id VARCHAR(20) NOT NULL,
    
    -- Datos de la cotización
    quote_id VARCHAR(64),
    premium DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'COP',
    valid_until TIMESTAMP,
    
    -- Datos del pago
    payment_id VARCHAR(64),
    payment_status VARCHAR(20),
    
    -- Datos de emisión
    policy_number VARCHAR(64),
    external_ref VARCHAR(64),
    
    -- Trazabilidad
    correlation_id VARCHAR(64) NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Para reconciliación
    last_retry_at TIMESTAMP WITH TIME ZONE,
    retry_count INTEGER DEFAULT 0
);

-- Tabla para outbox de eventos
CREATE TABLE outbox_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_id UUID NOT NULL REFERENCES orders(id),
    event_type VARCHAR(64) NOT NULL,
    payload JSONB NOT NULL,
    published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published_at TIMESTAMP WITH TIME ZONE
);

-- Tabla para dead letter queue
CREATE TABLE dead_letter_queue (
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

-- Índices
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_idempotency ON orders(idempotency_key);
CREATE INDEX idx_orders_correlation ON orders(correlation_id);
CREATE INDEX idx_orders_external_ref ON orders(external_ref);
CREATE INDEX idx_outbox_unpublished ON outbox_events(published, created_at);
CREATE INDEX idx_dlq_retry ON dead_letter_queue(next_retry_at, retry_count);
