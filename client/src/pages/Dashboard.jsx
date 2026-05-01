import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import apiClient from '../api/client';
import { formatDistanceToNow } from 'date-fns';
import {
  Plus, ExternalLink, Trash2, Play, Pause, Activity,
  Globe, AlertCircle, CheckCircle, Clock, Zap, X, Server,
  Type, ChevronRight, BarChart3, CreditCard
} from 'lucide-react';
import Chatbot from '../components/Chatbot';

const Dashboard = () => {
  const navigate = useNavigate();
  const [monitors, setMonitors] = useState([]);
  const [stats, setStats] = useState({ total: 0, up: 0, down: 0, unknown: 0 });
  const [plan, setPlan] = useState('free');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newMonitor, setNewMonitor] = useState({ name: '', url: '', type: 'HTTP', port: '', keyword: '' });
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  const fetchMonitors = async () => {
    try {
      const [monRes, planRes] = await Promise.all([
        apiClient.get('/monitors'),
        apiClient.get('/payment/status').catch(() => null),
      ]);
      const monData = monRes.data.monitors || [];
      setMonitors(monData);
      setStats({
        total:   monData.length,
        up:      monData.filter((m) => m.currentStatus === 'UP').length,
        down:    monData.filter((m) => m.currentStatus === 'DOWN').length,
        unknown: monData.filter((m) => !m.currentStatus || m.currentStatus === 'UNKNOWN').length,
      });
      if (planRes?.success) setPlan(planRes.data.plan?.type || 'free');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonitors();
    const interval = setInterval(fetchMonitors, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleAddMonitor = async (e) => {
    e.preventDefault();
    setModalError('');
    setModalLoading(true);
    try {
      const payload = { name: newMonitor.name, url: newMonitor.url, type: newMonitor.type };
      if (newMonitor.type === 'PORT' && newMonitor.port) payload.port = parseInt(newMonitor.port);
      if (newMonitor.type === 'KEYWORD' && newMonitor.keyword) payload.keyword = newMonitor.keyword;
      const res = await apiClient.post('/monitors', payload);
      setIsModalOpen(false);
      setNewMonitor({ name: '', url: '', type: 'HTTP', port: '', keyword: '' });
      if (res.data.monitor?._id) navigate(`/monitor/${res.data.monitor._id}`);
      else fetchMonitors();
    } catch (err) {
      setModalError(err.message || 'Failed to add monitor');
    } finally {
      setModalLoading(false);
    }
  };

  const toggleMonitor = async (id) => {
    try {
      await apiClient.patch(`/monitors/${id}/toggle`);
      fetchMonitors();
    } catch (err) { alert(err.message || 'Failed to toggle'); }
  };

  const deleteMonitor = async (id) => {
    if (!window.confirm('Delete this monitor and all its history?')) return;
    try {
      await apiClient.delete(`/monitors/${id}`);
      fetchMonitors();
    } catch (err) { alert(err.message || 'Failed to delete'); }
  };

  const typeIcon = (type) => {
    if (type === 'PORT') return <Server size={13} />;
    if (type === 'KEYWORD') return <Type size={13} />;
    return <Globe size={13} />;
  };

  const statCards = [
    { label: 'Total Monitors', value: stats.total, icon: BarChart3, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Sites UP',       value: stats.up,    icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Sites DOWN',     value: stats.down,  icon: AlertCircle, color: 'text-red-500',     bg: 'bg-red-50' },
    { label: 'Current Plan',   value: plan.toUpperCase(), icon: CreditCard, color: 'text-indigo-600', bg: 'bg-indigo-50', isText: true },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            My Monitors
          </h1>
          <p className="text-slate-400 text-sm mt-1">Real-time uptime tracking for all your websites.</p>
        </div>
        <button
          id="add-monitor-btn"
          onClick={() => setIsModalOpen(true)}
          className="btn btn-primary self-start sm:self-auto"
        >
          <Plus size={16} /> Add Monitor
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map(({ label, value, icon: Icon, color, bg, isText }) => (
          <div key={label} className="stat-card">
            <div className="flex items-center justify-between mb-3">
              <div className={`stat-card-icon ${bg}`}>
                <Icon size={18} className={color} />
              </div>
            </div>
            <div className={`stat-card-value ${isText ? 'text-2xl' : ''}`}>{value}</div>
            <div className="stat-card-label mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Monitor List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card">
              <div className="skeleton h-5 w-1/2 mb-3 rounded" />
              <div className="skeleton h-3.5 w-3/4 mb-6 rounded" />
              <div className="skeleton h-8 w-full rounded" />
            </div>
          ))}
        </div>
      ) : monitors.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="card text-center py-20"
        >
          <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Activity size={28} className="text-indigo-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">No monitors yet</h3>
          <p className="text-slate-400 text-sm max-w-xs mx-auto mb-7">Add your first website to start 24/7 uptime monitoring with AI-powered alerts.</p>
          <button className="btn btn-primary btn-pill" onClick={() => setIsModalOpen(true)}>
            <Plus size={16} /> Add Your First Monitor
          </button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <AnimatePresence>
            {monitors.map((m, i) => {
              const isDown    = m.currentStatus === 'DOWN';
              const isUp      = m.currentStatus === 'UP';
              const isUnknown = !m.currentStatus || m.currentStatus === 'UNKNOWN';

              return (
                <motion.div
                  key={m._id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`card card-hover flex flex-col group border-l-4 ${
                    isDown    ? 'border-l-red-400' :
                    isUp      ? 'border-l-emerald-400' :
                                'border-l-slate-200'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0 mr-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`status-dot ${isDown ? 'status-dot-down' : isUp ? 'status-dot-up' : 'bg-slate-300'}`} />
                        <h3 className="font-bold text-slate-900 truncate">{m.name}</h3>
                      </div>
                      <a
                        href={m.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-slate-400 hover:text-indigo-500 truncate block max-w-full transition-colors no-underline"
                      >
                        {m.url}
                      </a>
                    </div>
                    <span className={`badge flex-shrink-0 ${isDown ? 'badge-down' : isUp ? 'badge-up' : 'badge-unknown'}`}>
                      {m.currentStatus || 'UNKNOWN'}
                    </span>
                  </div>

                  {/* Metrics Row */}
                  <div className="flex items-center gap-4 py-3 border-y border-slate-50 mb-4">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Zap size={12} className="text-indigo-400" />
                      <span className="font-semibold text-slate-700">
                        {m.lastResponseTime ? `${m.lastResponseTime}ms` : '—'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Clock size={12} className="text-indigo-400" />
                      <span>{m.lastCheckedAt ? formatDistanceToNow(new Date(m.lastCheckedAt)) + ' ago' : 'Never'}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-400 ml-auto">
                      {typeIcon(m.type)}
                      <span>{m.type}</span>
                    </div>
                  </div>

                  {/* AI Analysis (if DOWN) */}
                  {m.lastAiAnalysis && isDown && (
                    <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-3 text-xs text-red-700 flex items-start gap-1.5">
                      <AlertCircle size={13} className="flex-shrink-0 mt-0.5 text-red-500" />
                      <span className="line-clamp-2">{m.lastAiAnalysis}</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 mt-auto">
                    <button
                      onClick={() => navigate(`/monitor/${m._id}`)}
                      className="btn btn-secondary btn-sm flex-1 text-xs"
                    >
                      <ExternalLink size={12} /> View Report
                    </button>
                    <button
                      onClick={() => toggleMonitor(m._id)}
                      className="btn btn-ghost btn-sm btn-icon"
                      title={m.isActive ? 'Pause' : 'Resume'}
                    >
                      {m.isActive ? <Pause size={14} /> : <Play size={14} />}
                    </button>
                    <button
                      onClick={() => deleteMonitor(m._id)}
                      className="btn btn-ghost btn-sm btn-icon text-red-400 hover:bg-red-50 hover:text-red-600"
                      title="Delete monitor"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Add Monitor Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
            onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={{ type: 'spring', damping: 22, stiffness: 220 }}
              className="modal-content"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    Add New Monitor
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">We'll start pinging immediately after you add.</p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-ghost btn-icon text-slate-400"
                >
                  <X size={18} />
                </button>
              </div>

              {modalError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2.5 rounded-lg mb-4 flex items-center gap-2">
                  <AlertCircle size={14} className="flex-shrink-0" />
                  {modalError}
                </div>
              )}

              <form onSubmit={handleAddMonitor} className="flex flex-col gap-4">
                <div>
                  <label className="form-label">Display Name</label>
                  <input
                    required
                    type="text"
                    className="form-input"
                    value={newMonitor.name}
                    onChange={(e) => setNewMonitor({ ...newMonitor, name: e.target.value })}
                    placeholder="My App, Portfolio..."
                  />
                </div>

                <div>
                  <label className="form-label">Monitor Type</label>
                  <select
                    className="form-input"
                    value={newMonitor.type}
                    onChange={(e) => setNewMonitor({ ...newMonitor, type: e.target.value })}
                  >
                    <option value="HTTP">🌐 HTTP(s) — Website / API</option>
                    <option value="KEYWORD">🔍 Keyword — Find text on page</option>
                    <option value="PORT">🔌 Port — TCP connection check</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">{newMonitor.type === 'PORT' ? 'Target (IP or Domain)' : 'URL'}</label>
                  <input
                    required
                    type={newMonitor.type === 'PORT' ? 'text' : 'url'}
                    className="form-input"
                    value={newMonitor.url}
                    onChange={(e) => setNewMonitor({ ...newMonitor, url: e.target.value })}
                    placeholder={newMonitor.type === 'PORT' ? '1.1.1.1 or example.com' : 'https://example.com'}
                  />
                </div>

                {newMonitor.type === 'PORT' && (
                  <div>
                    <label className="form-label">Port Number</label>
                    <input
                      required
                      type="number"
                      min="1"
                      max="65535"
                      className="form-input"
                      value={newMonitor.port}
                      onChange={(e) => setNewMonitor({ ...newMonitor, port: e.target.value })}
                      placeholder="e.g. 3306, 443, 21"
                    />
                  </div>
                )}

                {newMonitor.type === 'KEYWORD' && (
                  <div>
                    <label className="form-label">Keyword to Search</label>
                    <input
                      required
                      type="text"
                      className="form-input"
                      value={newMonitor.keyword}
                      onChange={(e) => setNewMonitor({ ...newMonitor, keyword: e.target.value })}
                      placeholder="e.g. ahrefs, Out of Stock"
                    />
                  </div>
                )}

                <div className="flex gap-3 mt-2">
                  <button
                    type="submit"
                    disabled={modalLoading}
                    className="btn btn-primary flex-1"
                  >
                    {modalLoading ? (
                      <><span className="spinner !w-4 !h-4 !border-2 !border-white/30 !border-t-white" /> Adding...</>
                    ) : (
                      <><Plus size={15} /> Add Monitor</>
                    )}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setIsModalOpen(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Chatbot />
    </div>
  );
};

export default Dashboard;
