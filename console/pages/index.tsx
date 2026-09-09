import type { NextPage } from 'next';
import Head from 'next/head';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Order, OrderStatus, STATUS_COLORS, STATUS_LABELS } from '../lib/types';

const Home: NextPage = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('');
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    plate: '',
    vehicle_year: new Date().getFullYear(),
    city_code: 'BOG',
    document_id: '',
  });

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, search]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (search) params.append('search', search);
      const response = await fetch(`/api/orders?${params.toString()}`);
      const data = await response.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const createOrder = async () => {
    if (!formData.plate || !formData.document_id) return;
    setCreating(true);
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': `console-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        },
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        setShowCreateModal(false);
        setFormData({ plate: '', vehicle_year: new Date().getFullYear(), city_code: 'BOG', document_id: '' });
        fetchOrders();
      }
    } catch (error) {
      console.error('Failed to create order:', error);
    } finally {
      setCreating(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
  };

  const getStatusCounts = () => {
    const counts: Record<string, number> = {};
    orders.forEach(o => { counts[o.status] = (counts[o.status] || 0) + 1; });
    return counts;
  };

  const statusCounts = getStatusCounts();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Head>
        <title>Super Leader - Consola de Operaciones</title>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🛡️</text></svg>" />
      </Head>

      <header className="bg-slate-800/80 backdrop-blur-sm border-b border-slate-700">
        <div className="max-w-7xl mx-auto py-5 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-xl flex items-center justify-center text-xl">🛡️</div>
            <div>
              <h1 className="text-2xl font-bold text-white">Super Leader</h1>
              <p className="text-xs text-slate-400">Consola de Operaciones - Pólizas Vehiculares</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold rounded-xl hover:from-emerald-600 hover:to-cyan-600 transition-all shadow-lg shadow-emerald-500/25 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Nueva Orden
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total', value: orders.length, color: 'from-blue-500 to-blue-600' },
            { label: 'Emitidas', value: statusCounts['ISSUED'] || 0, color: 'from-emerald-500 to-emerald-600' },
            { label: 'En Proceso', value: (statusCounts['CREATED'] || 0) + (statusCounts['QUOTED'] || 0) + (statusCounts['PAYMENT_PENDING'] || 0) + (statusCounts['ISSUING'] || 0), color: 'from-amber-500 to-amber-600' },
            { label: 'Canceladas', value: statusCounts['CANCELLED'] || 0, color: 'from-red-500 to-red-600' },
          ].map((stat) => (
            <div key={stat.label} className="bg-slate-800/60 backdrop-blur-sm rounded-2xl p-4 border border-slate-700/50">
              <div className={`w-10 h-10 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center mb-3`}>
                <span className="text-white text-lg font-bold">{stat.value}</span>
              </div>
              <p className="text-slate-400 text-sm">{stat.label}</p>
              <p className="text-white text-2xl font-bold">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl p-4 border border-slate-700/50 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input
                type="text"
                placeholder="Buscar por placa, documento o ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as OrderStatus | '')}
              className="px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            >
              <option value="">Todos los estados</option>
              {Object.entries(STATUS_LABELS).map(([status, label]) => (
                <option key={status} value={status}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent mx-auto"></div>
            <p className="mt-4 text-slate-400">Cargando órdenes...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 bg-slate-800/60 rounded-2xl border border-slate-700/50">
            <div className="text-6xl mb-4">📋</div>
            <p className="text-slate-400 text-lg">No se encontraron órdenes</p>
            <button onClick={() => setShowCreateModal(true)} className="mt-4 px-6 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all">
              Crear primera orden
            </button>
          </div>
        ) : (
          <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl border border-slate-700/50 overflow-hidden">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Placa</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Prima</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Fecha</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-6 py-4">
                      <Link href={`/orders/${order.id}`} className="text-emerald-400 hover:text-emerald-300 font-mono text-sm">
                        {order.id.substring(0, 8)}...
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-white font-semibold">{order.plate}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${STATUS_COLORS[order.status]}`}>
                        {STATUS_LABELS[order.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-white">
                      {order.premium ? `$${order.premium.toLocaleString()} ${order.currency}` : '-'}
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-sm">
                      {formatDate(order.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      <Link href={`/orders/${order.id}`} className="text-emerald-400 hover:text-emerald-300 text-sm font-medium">
                        Ver detalle →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-slate-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Nueva Orden</h2>
                <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Placa del vehículo</label>
                <input
                  type="text"
                  placeholder="Ej: ABC123"
                  value={formData.plate}
                  onChange={(e) => setFormData({ ...formData, plate: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Año</label>
                  <input
                    type="number"
                    min="2000"
                    max="2026"
                    value={formData.vehicle_year}
                    onChange={(e) => setFormData({ ...formData, vehicle_year: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Ciudad</label>
                  <select
                    value={formData.city_code}
                    onChange={(e) => setFormData({ ...formData, city_code: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    <option value="BOG">Bogotá</option>
                    <option value="MED">Medellín</option>
                    <option value="CLO">Cali</option>
                    <option value="BCN">Barranquilla</option>
                    <option value="BUC">Bucaramanga</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Documento del titular</label>
                <input
                  type="text"
                  placeholder="Ej: 1234567890"
                  value={formData.document_id}
                  onChange={(e) => setFormData({ ...formData, document_id: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="p-6 border-t border-slate-700 flex gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-3 bg-slate-700 text-white rounded-xl hover:bg-slate-600 transition-all font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={createOrder}
                disabled={!formData.plate || !formData.document_id || creating}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-xl hover:from-emerald-600 hover:to-cyan-600 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {creating ? (
                  <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div> Creando...</>
                ) : (
                  <>Crear Orden</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
