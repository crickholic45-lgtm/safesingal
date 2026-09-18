'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const ZoneMap = dynamic(() => import('./ZoneMap'), { ssr: false });

type AlertRow = {
  id: string;
  score: number;
  tier: string;
  distinct_reporters: number;
  distinct_days: number;
  total_reports: number;
  top_categories: string[];
  status: string;
  updated_at: string;
  zones: { name: string; latitude: number; longitude: number; venue_type: string } | null;
};

type ReportRow = {
  id: string;
  report_ref_id: string;
  category: string;
  detail: string | null;
  latitude: number | null;
  longitude: number | null;
  is_immediate: boolean;
  created_at: string;
  zones: { name: string } | null;
};

export default function DashboardPage() {
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [historyAlerts, setHistoryAlerts] = useState<AlertRow[]>([]);
  const [historyReports, setHistoryReports] = useState<ReportRow[]>([]);
  const [view, setView] = useState<'active' | 'history'>('active');

  async function loadAlerts() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/alerts');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not load alerts.');
      setAlerts(data.alerts || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load alerts.');
    } finally {
      setLoading(false);
    }
  }

  async function loadHistory() {
    try {
      const res = await fetch('/api/history');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not load history.');
      setHistoryAlerts(data.alerts || []);
      setHistoryReports(data.reports || []);
    } catch (historyError) {
      setError(historyError instanceof Error ? historyError.message : 'Could not load history.');
    }
  }

  async function recalculate() {
    setRecalculating(true);
    setError('');
    setActionMessage('');
    try {
      const res = await fetch('/api/score', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Pattern recalculation failed.');
      await loadAlerts();
      await loadHistory();
      setActionMessage('Patterns recalculated just now.');
    } catch (recalculateError) {
      setError(recalculateError instanceof Error ? recalculateError.message : 'Pattern recalculation failed.');
    } finally {
      setRecalculating(false);
    }
  }

  async function setStatus(id: string, status: string) {
    setError('');
    setActionMessage('');
    try {
      const res = await fetch(`/api/alerts/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not update this alert.');
      setAlerts((current) => current.filter((alert) => alert.id !== id));
      await loadHistory();
      setActionMessage(status === 'reviewed' ? 'Alert marked as reviewed.' : 'Alert dismissed.');
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : 'Could not update this alert.');
    }
  }

  useEffect(() => {
    loadAlerts();
    loadHistory();
  }, []);

  return (
    <div className="dashboard-container">
      <nav className="top">
        <div>
          <div className="page-kicker">Operations view</div>
          <h1 style={{ margin: 0 }}>Authority dashboard</h1>
        </div>
        <a href="/report">Open public report <span aria-hidden="true">↗</span></a>
      </nav>
      <p className="subtitle">
        Reviewed here, place-based only — no individual is ever named by this system.
      </p>

      <div className="dashboard-toolbar">
        <div><strong>Active signals</strong><span>{loading ? 'Refreshing data...' : `${alerts.length} requiring attention`}</span></div>
        <button className="recalc-btn" onClick={recalculate} disabled={recalculating}>
          {recalculating ? <><span className="inline-spinner light" /> Recalculating...</> : 'Recalculate patterns'}
        </button>
      </div>

      <div className="dashboard-tabs" role="tablist" aria-label="Dashboard views">
        <button type="button" className={view === 'active' ? 'active' : ''} onClick={() => setView('active')}>Active signals</button>
        <button type="button" className={view === 'history' ? 'active' : ''} onClick={() => setView('history')}>Past history</button>
      </div>

      {error ? <div className="error-panel" role="alert"><strong>Something went wrong.</strong> {error} <button type="button" onClick={loadAlerts}>Try again</button></div> : null}
      {actionMessage ? <div className="success-panel" role="status">{actionMessage}</div> : null}

      {view === 'active' && alerts.length > 0 && <ZoneMap alerts={alerts} />}

      {view === 'history' ? (
        <div className="history-layout">
          <section>
            <div className="section-heading"><h2>Alert history</h2><span>{historyAlerts.length} records</span></div>
            {historyAlerts.length === 0 ? <div className="empty-state">No alert history yet.</div> : historyAlerts.map((alert) => (
              <div key={alert.id} className={`history-alert ${alert.status}`}>
                <div><strong>{alert.zones?.name || 'Unknown zone'}</strong><span className={`tier-badge ${alert.tier}`}>{alert.tier}</span></div>
                <p>{alert.status} · {alert.total_reports || 0} reports · score {alert.score?.toFixed(2)}</p>
                <small>Updated {new Date(alert.updated_at).toLocaleString()}</small>
              </div>
            ))}
          </section>
          <section>
            <div className="section-heading"><h2>Recent reports</h2><span>{historyReports.length} records</span></div>
            {historyReports.length === 0 ? <div className="empty-state">No reports yet.</div> : historyReports.map((report) => (
              <div key={report.id} className="report-history-row">
                <div><strong>{report.zones?.name || 'Unknown location'}</strong><span>{report.category.replaceAll('_', ' ')}</span></div>
                <small>{report.report_ref_id} · {new Date(report.created_at).toLocaleString()}</small>
                {report.detail ? <p>{report.detail}</p> : null}
              </div>
            ))}
          </section>
        </div>
      ) : loading ? (
        <div className="loading-panel"><span className="inline-spinner" /> Loading active signals...</div>
      ) : alerts.length === 0 ? (
        <div className="empty-state">
          No active alerts. Submit a few reports on the public page, then hit
          &ldquo;Recalculate patterns now&rdquo;.
        </div>
      ) : (
        alerts.map((a) => (
          <div key={a.id} className={`alert-card ${a.tier}`}>
            <div className="alert-title">
              {a.zones?.name || 'Unknown zone'}
              <span className={`tier-badge ${a.tier}`}>{a.tier}</span>
            </div>
            <div className="alert-meta">
              Score {a.score?.toFixed(2)} · {a.distinct_reporters} distinct reporters ·{' '}
              {a.distinct_days} distinct days · {a.total_reports} total reports
              <br />
              Categories: {a.top_categories?.join(', ')}
            </div>
            <div className="alert-actions">
              <button onClick={() => setStatus(a.id, 'reviewed')}>Mark reviewed</button>
              <button onClick={() => setStatus(a.id, 'dismissed')}>Dismiss (false alarm)</button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
