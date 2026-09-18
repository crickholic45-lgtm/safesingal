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
  zones: { name: string; latitude: number; longitude: number; venue_type: string } | null;
};

export default function DashboardPage() {
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');

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

  async function recalculate() {
    setRecalculating(true);
    setError('');
    setActionMessage('');
    try {
      const res = await fetch('/api/score', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Pattern recalculation failed.');
      await loadAlerts();
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
      setActionMessage(status === 'reviewed' ? 'Alert marked as reviewed.' : 'Alert dismissed.');
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : 'Could not update this alert.');
    }
  }

  useEffect(() => {
    loadAlerts();
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

      {error ? <div className="error-panel" role="alert"><strong>Something went wrong.</strong> {error} <button type="button" onClick={loadAlerts}>Try again</button></div> : null}
      {actionMessage ? <div className="success-panel" role="status">{actionMessage}</div> : null}

      {alerts.length > 0 && <ZoneMap alerts={alerts} />}

      {loading ? (
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
