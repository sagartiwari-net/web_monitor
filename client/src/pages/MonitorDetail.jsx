import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { motion } from 'framer-motion';
import apiClient from '../api/client';
import { formatDistanceToNow, format } from 'date-fns';
import {
  ArrowLeft, Activity, Globe, Clock, Zap, Target, Search,
  Sparkles, Lock, Terminal, Type, AlertCircle, CheckCircle,
  ExternalLink, RefreshCw, TrendingUp, Shield
} from 'lucide-react';

const MonitorDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [monitor, setMonitor] = useState(null);
  const [auditData, setAuditData] = useState(null);
  const [logsData, setLogsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [auditLoading, setAuditLoading] = useState(false);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const [monRes, auditRes, logsRes] = await Promise.all([
        apiClient.get(`/monitors/${id}`),
        apiClient.get(`/audit/${id}`).catch(() => ({ data: { audit: null } })),
        apiClient.get(`/logs/${id}?limit=90`).catch(() => ({ data: { logs: [] } })),
      ]);
      // Handle both response shapes
      const monData = monRes.data?.monitor || monRes.monitor || monRes.data || monRes;
      setMonitor(monData);
      setAuditData(auditRes?.data?.audit || null);
      const logsArr = logsRes?.data?.logs || logsRes?.logs || [];
      setLogsData(logsArr);
    } catch (err) {
      alert(err.message || 'Failed to fetch monitor details');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const runAudit = async () => {
    setAuditLoading(true);
    try {
      const res = await apiClient.post(`/audit/${id}`);
      // API returns { success, data: { audit } }
      const auditResult = res?.data?.audit || res?.audit || null;
      setAuditData(auditResult);
      if (!auditResult) alert('Audit completed but no data returned.');
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Audit failed';
      alert(`Audit failed: ${msg}`);
    } finally {
      setAuditLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="spinner" />
        <p className="text-slate-400 text-sm">Loading monitor details...</p>
      </div>
    );
  }

  if (!monitor) return null;

  const currentStatus = monitor.status?.toUpperCase() || monitor.currentStatus || 'UNKNOWN';
  const isDown = currentStatus === 'DOWN';
  const isUp = currentStatus === 'UP';
  const lastResponseTime = logsData.length > 0 ? logsData[0].responseTime : monitor.lastResponseTime;

  /* Score Ring Component */
  const ScoreRing = ({ score, label }) => {
    const color = score >= 90 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
    const size = 88;
    const strokeW = 6;
    const r = (size - strokeW) / 2;
    const circ = 2 * Math.PI * r;
    const offset = circ - (score / 100) * circ;

    return (
      <div className="flex flex-col items-center gap-2">
        <svg width={size} height={size}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={strokeW} />
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke={color} strokeWidth={strokeW}
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transition: 'stroke-dashoffset 1s ease' }}
          />
          <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
            fontSize="20" fontWeight="800" fill={color}
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {score}
          </text>
        </svg>
        <span className="text-xs text-slate-500 font-medium text-center max-w-[80px] leading-tight">{label}</span>
      </div>
    );
  };

  return (
    <div className="pb-16">

      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex items-start gap-4 mb-8">
        <button
          onClick={() => navigate('/dashboard')}
          className="btn btn-ghost btn-icon mt-1 flex-shrink-0 text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3 mb-1">
            <h1
              className="text-2xl font-extrabold text-slate-900"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              {monitor.name}
            </h1>
            <span className={`badge ${isDown ? 'badge-down' : isUp ? 'badge-up' : 'badge-unknown'}`}>
              {isDown && <span className="status-dot status-dot-down mr-1" />}
              {currentStatus}
            </span>
          </div>
          <a
            href={monitor.url}
            target="_blank"
            rel="noreferrer"
            className="text-indigo-500 hover:text-indigo-700 text-sm flex items-center gap-1 no-underline transition-colors"
          >
            <Globe size={13} /> {monitor.url} <ExternalLink size={11} />
          </a>
        </div>
        <button onClick={fetchDetails} className="btn btn-ghost btn-icon text-slate-400 mt-1" title="Refresh">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* ── Stat Cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <div className="stat-card">
          <div className={`stat-card-icon mb-3 ${isDown ? 'bg-red-50' : isUp ? 'bg-emerald-50' : 'bg-slate-50'}`}>
            {isDown
              ? <AlertCircle size={18} className="text-red-500" />
              : <CheckCircle size={18} className="text-emerald-500" />
            }
          </div>
          <div className={`stat-card-value text-2xl ${isDown ? 'text-red-500' : isUp ? 'text-emerald-500' : 'text-slate-500'}`}>
            {currentStatus}
          </div>
          <div className="stat-card-label mt-1">Current Status</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon bg-indigo-50 mb-3">
            <Zap size={18} className="text-indigo-600" />
          </div>
          <div className="stat-card-value text-2xl">
            {lastResponseTime ? `${lastResponseTime}` : '—'}
            {lastResponseTime && <span className="text-sm font-normal text-slate-400 ml-1">ms</span>}
          </div>
          <div className="stat-card-label mt-1">Response Time</div>
        </div>

        <div className="stat-card col-span-2 md:col-span-1">
          <div className="stat-card-icon bg-slate-50 mb-3">
            <Clock size={18} className="text-slate-500" />
          </div>
          <div className="stat-card-value text-lg font-bold">
            {(monitor.lastChecked || monitor.lastCheckedAt)
              ? formatDistanceToNow(new Date(monitor.lastChecked || monitor.lastCheckedAt)) + ' ago'
              : 'Never'
            }
          </div>
          <div className="stat-card-label mt-1">Last Checked</div>
        </div>
      </div>

      {/* ── DOWN Reason Banner ────────────────────────────────────── */}
      {isDown && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl bg-red-50 border border-red-200 px-5 py-4 mb-6 flex items-start gap-3"
        >
          <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-red-800 text-sm">Monitor is currently DOWN</div>
            <p className="text-sm text-red-700 mt-0.5 opacity-90">
              <strong>Reason:</strong>{' '}
              {logsData.length > 0 && logsData[0].error
                ? logsData[0].error
                : 'Check pending or network failure'
              }
              {monitor.lastStatusCode ? ` (HTTP ${monitor.lastStatusCode})` : ''}
            </p>
          </div>
        </motion.div>
      )}

      {/* ── Uptime History Timeline ───────────────────────────────── */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <Activity size={16} className="text-indigo-500" />
            Uptime History
          </h3>
          {logsData.length > 0 && (
            <span className="text-xs text-slate-400">
              Last {logsData.length} checks
            </span>
          )}
        </div>

        {logsData.length > 0 ? (
          <div>
            <div className="flex h-9 gap-px w-full bg-slate-50 p-1 rounded-xl overflow-hidden">
              {[...logsData].reverse().map((log, index) => (
                <div
                  key={index}
                  className={`flex-1 rounded-sm cursor-pointer transition-all hover:scale-y-110 ${log.status === 'up' || log.status === 'UP' ? 'bg-emerald-400' : 'bg-red-400'
                    }`}
                  title={`${format(new Date(log.createdAt || log.checkedAt), 'dd MMM, HH:mm')} — ${log.status?.toUpperCase()}${log.error ? ` (${log.error})` : ` — ${log.responseTime}ms`}`}
                />
              ))}
            </div>
            <div className="flex justify-between text-xs text-slate-400 font-medium mt-2 px-1">
              <span>
                {logsData.length > 0
                  ? formatDistanceToNow(new Date(logsData[logsData.length - 1].createdAt || logsData[logsData.length - 1].checkedAt)) + ' ago'
                  : 'Oldest'}
              </span>
              <span>Now</span>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-slate-400 text-sm bg-slate-50 rounded-xl">
            No history yet — data will appear after first check cycle.
          </div>
        )}
      </div>

      {/* ── Advanced Check Cards (SSL / Port / Keyword) ───────────── */}
      {(monitor.sslExpiry || monitor.type === 'PORT' || monitor.type === 'KEYWORD') && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {monitor.sslExpiry && (
            <div className="card bg-gradient-to-br from-slate-800 to-slate-900 text-white border-none">
              <div className="stat-card-icon bg-white/10 mb-3">
                <Shield size={18} className="text-emerald-400" />
              </div>
              <div className="font-bold text-lg">SSL Certificate</div>
              <div className="text-slate-300 text-sm mt-1">{monitor.sslIssuer || 'Valid'}</div>
              <div className="text-xs text-slate-400 mt-2">
                Expires: {format(new Date(monitor.sslExpiry), 'dd MMM yyyy')}
              </div>
            </div>
          )}
          {monitor.type === 'PORT' && (
            <div className="card">
              <div className="stat-card-icon bg-orange-50 mb-3">
                <Terminal size={18} className="text-orange-600" />
              </div>
              <div className="font-bold">TCP Port</div>
              <div className="text-slate-500 text-sm mt-1">Port {monitor.port}</div>
            </div>
          )}
          {monitor.type === 'KEYWORD' && (
            <div className="card">
              <div className="stat-card-icon bg-pink-50 mb-3">
                <Type size={18} className="text-pink-600" />
              </div>
              <div className="font-bold">Keyword Check</div>
              <div className="text-slate-500 text-sm mt-1 truncate">"{monitor.keyword}"</div>
            </div>
          )}
        </div>
      )}

      {/* ── PageSpeed & AI Audit ─────────────────────────────────── */}
      <div className="card !p-0 overflow-hidden">
        {/* Section header */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 p-6 border-b border-slate-100 bg-slate-50/60">
          <div>
            <h2 className="font-bold text-slate-900 flex items-center gap-2">
              <Target size={18} className="text-indigo-500" />
              PageSpeed & AI Audit
            </h2>
            <p className="text-xs text-slate-400 mt-1">Google Lighthouse + Gemini AI analysis.</p>
          </div>
          <button
            onClick={runAudit}
            disabled={auditLoading}
            className="btn btn-primary btn-sm self-start sm:self-auto whitespace-nowrap"
          >
            {auditLoading ? (
              <><span className="spinner !w-3.5 !h-3.5 !border-2 !border-white/30 !border-t-white" /> Analyzing...</>
            ) : (
              <><Search size={14} /> Run Deep Audit</>
            )}
          </button>
        </div>

        {auditLoading ? (
          <div className="p-12 flex flex-col items-center justify-center text-center">
            <div className="w-14 h-14 rounded-full border-4 border-slate-100 border-t-indigo-500 animate-spin mb-5" />
            <h3 className="font-bold text-slate-800">Analyzing Website...</h3>
            <p className="text-slate-400 text-sm max-w-xs mt-2">
              Running Lighthouse checks and Gemini AI analysis. This takes ~30 seconds.
            </p>
          </div>
        ) : !auditData ? (
          <div className="p-14 text-center">
            <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Search size={22} className="text-indigo-300" />
            </div>
            <h3 className="font-semibold text-slate-700">No audit data yet</h3>
            <p className="text-sm text-slate-400 mt-1.5">Click "Run Deep Audit" to generate your first report.</p>
          </div>
        ) : (
          <div className="p-6">
            {/* Score Rings */}
            <div className="flex flex-wrap gap-8 justify-center mb-8 py-4">
              {[
                { key: 'perfScore', label: 'Performance' },
                { key: 'accessScore', label: 'Accessibility' },
                { key: 'bestPracticesScore', label: 'Best Practices' },
                { key: 'seoScore', label: 'SEO' },
              ].map(({ key, label }) => (
                <ScoreRing key={key} score={auditData[key] || 0} label={label} />
              ))}
            </div>

            {/* Audit timestamp */}
            <div className="text-center text-xs text-slate-400 mb-6">
              Audit generated: {auditData.createdAt
                ? format(new Date(auditData.createdAt), 'dd/MM/yyyy, HH:mm:ss')
                : 'N/A'
              }
            </div>

            {/* AI Analysis */}
            {auditData.aiAnalysis && (
              <div className="rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 p-5">
                <h4 className="font-bold text-indigo-900 flex items-center gap-2 mb-3">
                  <Sparkles size={16} className="text-indigo-500" />
                  Gemini AI Analysis
                </h4>
                <div className="prose prose-sm max-w-none text-slate-700 [&>p]:leading-relaxed [&>ul]:mt-2">
                  <ReactMarkdown>{auditData.aiAnalysis}</ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
};

export default MonitorDetail;
