export type OrderStatus =
  | 'CREATED'
  | 'QUOTED'
  | 'PAYMENT_PENDING'
  | 'PAID'
  | 'ISSUING'
  | 'ISSUED'
  | 'PAYMENT_FAILED'
  | 'ISSUING_FAILED'
  | 'REFUND_REQUIRED'
  | 'CANCELLED';

export interface Order {
  id: string;
  idempotency_key: string;
  status: OrderStatus;
  plate: string;
  vehicle_year: number;
  city_code: string;
  document_id: string;
  quote_id?: string;
  premium?: number;
  currency: string;
  valid_until?: string;
  payment_id?: string;
  payment_status?: string;
  policy_number?: string;
  external_ref?: string;
  correlation_id: string;
  created_at: string;
  updated_at: string;
  retry_count: number;
}

export interface TimelineEvent {
  id: string;
  order_id: string;
  event_type: string;
  description: string;
  timestamp: string;
  details?: string;
}

export const STATUS_COLORS: Record<OrderStatus, string> = {
  CREATED: 'bg-gray-100 text-gray-800',
  QUOTED: 'bg-blue-100 text-blue-800',
  PAYMENT_PENDING: 'bg-yellow-100 text-yellow-800',
  PAID: 'bg-green-100 text-green-800',
  ISSUING: 'bg-purple-100 text-purple-800',
  ISSUED: 'bg-green-100 text-green-800',
  PAYMENT_FAILED: 'bg-red-100 text-red-800',
  ISSUING_FAILED: 'bg-red-100 text-red-800',
  REFUND_REQUIRED: 'bg-orange-100 text-orange-800',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

export const STATUS_LABELS: Record<OrderStatus, string> = {
  CREATED: 'Creada',
  QUOTED: 'Cotizada',
  PAYMENT_PENDING: 'Pago Pendiente',
  PAID: 'Pagada',
  ISSUING: 'Emitiendo',
  ISSUED: 'Emitida',
  PAYMENT_FAILED: 'Pago Fallido',
  ISSUING_FAILED: 'Emisión Fallida',
  REFUND_REQUIRED: 'Reverso Requerido',
  CANCELLED: 'Cancelada',
};
