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

  async function loadAlerts() {
    setLoading(true);
    try {
      const res = await fetch('/api/alerts');
      const data = await res.json();
      setAlerts(data.alerts || []);
    } finally {
      setLoading(false);
    }
  }

  async function recalculate() {
    setRecalculating(true);
    try {
      await fetch('/api/score', { method: 'POST' });
      await loadAlerts();
    } finally {
      setRecalculating(false);
    }
  }

  async function setStatus(id: string, status: string) {
    await fetch(`/api/alerts/${id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    loadAlerts();
  }

  useEffect(() => {
    loadAlerts();
  }, []);

  return (
    <div className="dashboard-container">
      <nav className="top">
        <h1 style={{ margin: 0 }}>SafeSignal — Authority Dashboard</h1>
        <a href="/report">Public report page →</a>
      </nav>
      <p className="subtitle">
        Reviewed here, place-based only — no individual is ever named by this system.
      </p>

      <button className="recalc-btn" onClick={recalculate} disabled={recalculating}>
        {recalculating ? 'Recalculating...' : 'Recalculate patterns now'}
      </button>

      {alerts.length > 0 && <ZoneMap alerts={alerts} />}

      {loading ? (
        <p className="subtitle">Loading...</p>
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
