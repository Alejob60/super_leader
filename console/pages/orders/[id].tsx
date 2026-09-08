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
    if (id) {
      fetchOrder(id as string);
    }
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
    } catch (error) {
      console.error('Failed to retry issuing:', error);
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
    } catch (error) {
      console.error('Failed to mark for refund:', error);
    } finally {
      setActionLoading(false);
      setShowConfirm(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-CO', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  const getTimeline = (order: Order): TimelineEvent[] => {
    const events: TimelineEvent[] = [
      {
        timestamp: order.created_at,
        event: 'CREATED',
        description: 'Orden creada',
        details: `Placa: ${order.plate}, Año: ${order.vehicle_year}`,
      },
    ];

    if (order.quote_id) {
      events.push({
        timestamp: order.updated_at,
        event: 'QUOTED',
        description: 'Cotización recibida',
        details: `Prima: $${order.premium?.toLocaleString()} ${order.currency}`,
      });
    }

    if (order.payment_id) {
      events.push({
        timestamp: order.updated_at,
        event: 'PAYMENT_' + (order.payment_status || 'PENDING'),
        description: `Pago ${order.payment_status === 'APPROVED' ? 'aprobado' : order.payment_status === 'REJECTED' ? 'rechazado' : 'pendiente'}`,
        details: `Payment ID: ${order.payment_id}`,
      });
    }

    if (order.policy_number) {
      events.push({
        timestamp: order.updated_at,
        event: 'ISSUED',
        description: 'Póliza emitida',
        details: `Número: ${order.policy_number}`,
      });
    }

    return events.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Orden no encontrada</p>
      </div>
    );
  }

  const timeline = getTimeline(order);

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Orden {order.id.substring(0, 8)} - Super Leader</title>
      </Head>

      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => router.push('/')}
            className="text-indigo-600 hover:text-indigo-900 mb-2"
          >
            ← Volver a la lista
          </button>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Orden {order.id.substring(0, 8)}...
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                Placa: {order.plate} | Correlation ID: {order.correlation_id}
              </p>
            </div>
            <span className={`px-3 py-1 text-sm font-semibold rounded-full ${STATUS_COLORS[order.status]}`}>
              {STATUS_LABELS[order.status]}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Información de la Orden</h2>
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm text-gray-500">Vehículo</dt>
                  <dd className="text-sm font-medium text-gray-900">{order.plate} ({order.vehicle_year})</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Ciudad</dt>
                  <dd className="text-sm font-medium text-gray-900">{order.city_code}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Documento</dt>
                  <dd className="text-sm font-medium text-gray-900">{order.document_id}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Prima</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {order.premium ? `$${order.premium.toLocaleString()} ${order.currency}` : '-'}
                  </dd>
                </div>
                {order.policy_number && (
                  <div>
                    <dt className="text-sm text-gray-500">Póliza</dt>
                    <dd className="text-sm font-medium text-gray-900">{order.policy_number}</dd>
                  </div>
                )}
              </dl>
            </div>

            <div className="bg-white shadow rounded-lg p-6 mt-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Acciones Operativas</h2>
              <div className="flex gap-4">
                {(order.status === 'ISSUING_FAILED' || order.status === 'PAYMENT_FAILED') && (
                  <button
                    onClick={() => setShowConfirm('retry')}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {actionLoading ? 'Procesando...' : 'Reintentar Emisión'}
                  </button>
                )}
                {(order.status === 'ISSUING_FAILED' || order.status === 'ISSUED') && (
                  <button
                    onClick={() => setShowConfirm('refund')}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                  >
                    {actionLoading ? 'Procesando...' : 'Marcar para Reverso'}
                  </button>
                )}
              </div>

              {showConfirm && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800">
                    {showConfirm === 'retry'
                      ? '¿Estás seguro de reintentar la emisión de esta póliza?'
                      : '¿Estás seguro de marcar esta orden para reverso?'}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={showConfirm === 'retry' ? handleRetryIssuing : handleMarkForRefund}
                      className="px-3 py-1 bg-yellow-600 text-white text-sm rounded-md hover:bg-yellow-700"
                    >
                      Confirmar
                    </button>
                    <button
                      onClick={() => setShowConfirm(null)}
                      className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-400"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Línea de Tiempo</h2>
              <div className="flow-root">
                <ul className="-mb-8">
                  {timeline.map((event, eventIdx) => (
                    <li key={eventIdx}>
                      <div className="relative pb-8">
                        {eventIdx !== timeline.length - 1 ? (
                          <span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                        ) : null}
                        <div className="relative flex space-x-3">
                          <div>
                            <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${
                              event.event.includes('FAILED') || event.event === 'PAYMENT_REJECTED'
                                ? 'bg-red-500'
                                : event.event === 'ISSUED'
                                ? 'bg-green-500'
                                : 'bg-gray-400'
                            }`}>
                              <span className="text-white text-xs">●</span>
                            </span>
                          </div>
                          <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{event.description}</p>
                              {event.details && (
                                <p className="text-sm text-gray-500">{event.details}</p>
                              )}
                            </div>
                            <div className="whitespace-nowrap text-right text-sm text-gray-500">
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
