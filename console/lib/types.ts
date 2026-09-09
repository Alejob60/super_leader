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
  CREATED: 'bg-slate-500/20 text-slate-300 border border-slate-500/30',
  QUOTED: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  PAYMENT_PENDING: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
  PAID: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
  ISSUING: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
  ISSUED: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
  PAYMENT_FAILED: 'bg-red-500/20 text-red-300 border border-red-500/30',
  ISSUING_FAILED: 'bg-red-500/20 text-red-300 border border-red-500/30',
  REFUND_REQUIRED: 'bg-orange-500/20 text-orange-300 border border-orange-500/30',
  CANCELLED: 'bg-slate-500/20 text-slate-400 border border-slate-500/30',
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
