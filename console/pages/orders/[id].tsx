import type { NextPage } from 'next';
import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Order, OrderStatus, STATUS_COLORS, STATUS_LABELS } from '../../lib/types';

interface TimelineEvent {
  timestamp: string;
  event: string;
  description: string;
  details?: string;
}

const OrderDetail: NextPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (id) fetchOrder(id as string);
  }, [id]);

  const fetchOrder = async (orderId: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}`);
      const data = await response.json();
      setOrder(data);
    } catch (error) {
      console.error('Failed to fetch order:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRetryIssuing = async () => {
    if (!order) return;
    setActionLoading(true);
    try {
      await fetch(`/api/orders/${order.id}/retry-issuing`, { method: 'POST' });
      fetchOrder(order.id);
    } finally {
      setActionLoading(false);
      setShowConfirm(null);
    }
  };

  const handleMarkForRefund = async () => {
    if (!order) return;
    setActionLoading(true);
    try {
      await fetch(`/api/orders/${order.id}/mark-refund`, { method: 'POST' });
      fetchOrder(order.id);
    } finally {
      setActionLoading(false);
      setShowConfirm(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
  };

  const getTimeline = (order: Order): TimelineEvent[] => {
    const events: TimelineEvent[] = [
      { timestamp: order.created_at, event: 'CREATED', description: 'Orden creada', details: `Placa: ${order.plate}, Año: ${order.vehicle_year}` },
    ];
    if (order.quote_id) {
      events.push({ timestamp: order.updated_at, event: 'QUOTED', description: 'Cotización recibida', details: `Prima: $${order.premium?.toLocaleString()} ${order.currency}` });
    }
    if (order.payment_id) {
      events.push({ timestamp: order.updated_at, event: 'PAYMENT_' + (order.payment_status || 'PENDING'), description: `Pago ${order.payment_status === 'APPROVED' ? 'aprobado' : order.payment_status === 'REJECTED' ? 'rechazado' : 'pendiente'}`, details: `Payment ID: ${order.payment_id}` });
    }
    if (order.policy_number) {
      events.push({ timestamp: order.updated_at, event: 'ISSUED', description: 'Póliza emitida', details: `Número: ${order.policy_number}` });
    }
    return events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <p className="text-slate-400 text-lg">Orden no encontrada</p>
      </div>
    );
  }

  const timeline = getTimeline(order);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Head>
        <title>Orden {order.id.substring(0, 8)} - Super Leader</title>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🛡️</text></svg>" />
      </Head>

      <header className="bg-slate-800/80 backdrop-blur-sm border-b border-slate-700">
        <div className="max-w-7xl mx-auto py-5 px-4 sm:px-6 lg:px-8">
          <button onClick={() => router.push('/')} className="text-emerald-400 hover:text-emerald-300 mb-3 flex items-center gap-1 text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Volver a la lista
          </button>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-white">Orden {order.id.substring(0, 8)}...</h1>
              <p className="text-sm text-slate-400 mt-1">Placa: <span className="text-white font-semibold">{order.plate}</span> | Correlation ID: <span className="font-mono text-xs text-slate-300">{order.correlation_id}</span></p>
            </div>
            <span className={`px-4 py-1.5 text-sm font-semibold rounded-full ${STATUS_COLORS[order.status]}`}>
              {STATUS_LABELS[order.status]}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                Información de la Orden
              </h2>
              <dl className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Vehículo', value: `${order.plate} (${order.vehicle_year})` },
                  { label: 'Ciudad', value: order.city_code },
                  { label: 'Documento', value: order.document_id },
                  { label: 'Prima', value: order.premium ? `$${order.premium.toLocaleString()} ${order.currency}` : '-' },
                  { label: 'ID Pago', value: order.payment_id || '-' },
                  { label: 'Póliza', value: order.policy_number || '-' },
                ].map((item) => (
                  <div key={item.label}>
                    <dt className="text-xs text-slate-400 uppercase tracking-wider">{item.label}</dt>
                    <dd className="text-sm font-medium text-white mt-1">{item.value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                Acciones Operativas
              </h2>
              <div className="flex gap-3">
                {(order.status === 'ISSUING_FAILED' || order.status === 'PAYMENT_FAILED') && (
                  <button onClick={() => setShowConfirm('retry')} disabled={actionLoading}
                    className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 font-medium transition-all">
                    {actionLoading ? 'Procesando...' : 'Reintentar Emisión'}
                  </button>
                )}
                {(order.status === 'ISSUING_FAILED' || order.status === 'ISSUED') && (
                  <button onClick={() => setShowConfirm('refund')} disabled={actionLoading}
                    className="px-5 py-2.5 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl hover:from-red-600 hover:to-pink-600 disabled:opacity-50 font-medium transition-all">
                    {actionLoading ? 'Procesando...' : 'Marcar para Reverso'}
                  </button>
                )}
              </div>

              {showConfirm && (
                <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                  <p className="text-sm text-amber-300">
                    {showConfirm === 'retry' ? '¿Reintentar la emisión de esta póliza?' : '¿Marcar esta orden para reverso?'}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button onClick={showConfirm === 'retry' ? handleRetryIssuing : handleMarkForRefund}
                      className="px-4 py-2 bg-amber-500 text-white text-sm rounded-lg hover:bg-amber-600 font-medium">
                      Confirmar
                    </button>
                    <button onClick={() => setShowConfirm(null)}
                      className="px-4 py-2 bg-slate-600 text-white text-sm rounded-lg hover:bg-slate-500">
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Línea de Tiempo
              </h2>
              <div className="flow-root">
                <ul className="-mb-8">
                  {timeline.map((event, eventIdx) => (
                    <li key={eventIdx}>
                      <div className="relative pb-8">
                        {eventIdx !== timeline.length - 1 && (
                          <span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-slate-600" />
                        )}
                        <div className="relative flex space-x-3">
                          <div>
                            <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-slate-800 ${
                              event.event.includes('FAILED') || event.event === 'PAYMENT_REJECTED' ? 'bg-red-500' :
                              event.event === 'ISSUED' ? 'bg-emerald-500' : 'bg-slate-500'
                            }`}>
                              <span className="text-white text-xs">●</span>
                            </span>
                          </div>
                          <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1">
                            <div>
                              <p className="text-sm font-medium text-white">{event.description}</p>
                              {event.details && <p className="text-xs text-slate-400 mt-0.5">{event.details}</p>}
                            </div>
                            <div className="whitespace-nowrap text-right text-xs text-slate-500">
                              {formatDate(event.timestamp)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default OrderDetail;
