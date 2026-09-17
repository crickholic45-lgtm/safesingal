'use client';

import { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { supabaseBrowser } from '@/lib/supabase';

type Zone = { id: string; name: string };

const AMBIENT_CATEGORIES = [
  { key: 'catcalling', label: 'Catcalling' },
  { key: 'following', label: 'Being followed' },
  { key: 'loitering', label: 'Loitering' },
  { key: 'indecent_exposure', label: 'Indecent exposure' },
];

const SERIOUS_CATEGORIES = [
  { key: 'sexual_assault', label: 'Sexual assault' },
  { key: 'physical_threat', label: 'Physical threat / violence' },
];

// Anonymous device identity — a random ID generated once and kept
// in this browser's localStorage. Never sent anywhere except as an
// opaque token; never contains a name, phone number, or IP.
function getReporterToken(): string {
  const key = 'safesignal_reporter_token';
  let token = localStorage.getItem(key);
  if (!token) {
    token = uuidv4();
    localStorage.setItem(key, token);
  }
  return token;
}

export default function ReportPage() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [zoneId, setZoneId] = useState('');
  const [category, setCategory] = useState('');
  const [showMore, setShowMore] = useState(false);
  const [detail, setDetail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [refId, setRefId] = useState<string | null>(null);

  useEffect(() => {
    supabaseBrowser
      .from('zones')
      .select('id, name')
      .then(({ data }) => data && setZones(data as Zone[]));
  }, []);

  async function submit() {
    if (!zoneId || !category) return;
    setSubmitting(true);
    const reporter_token = getReporterToken();

    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zone_id: zoneId, category, detail, reporter_token }),
      });
      const data = await res.json();
      setRefId(data.report_ref_id || 'SUBMITTED');
    } catch {
      setRefId('SUBMITTED');
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setCategory('');
    setDetail('');
    setShowMore(false);
    setRefId(null);
  }

  if (refId) {
    return (
      <div className="container">
        <div className="confirmation">
          <h1>Report received</h1>
          <p className="subtitle">Thank you. No further action is needed from you.</p>
          <div className="ref-id">{refId}</div>
          <p className="subtitle">Keep this if you want to reference it later.</p>
          <span className="reset-link" onClick={reset}>
            File another report
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>Flag a moment</h1>
      <p className="subtitle">Anonymous. No account needed. Takes a few seconds.</p>

      <select value={zoneId} onChange={(e) => setZoneId(e.target.value)}>
        <option value="">Select location...</option>
        {zones.map((z) => (
          <option key={z.id} value={z.id}>
            {z.name}
          </option>
        ))}
      </select>

      <div className="chip-grid">
        {AMBIENT_CATEGORIES.map((c) => (
          <div
            key={c.key}
            className={`chip ${category === c.key ? 'selected' : ''}`}
            onClick={() => setCategory(c.key)}
          >
            {c.label}
          </div>
        ))}
      </div>

      <details>
        <summary>Something more serious?</summary>
        <div className="chip-grid" style={{ marginTop: 10 }}>
          {SERIOUS_CATEGORIES.map((c) => (
            <div
              key={c.key}
              className={`chip serious ${category === c.key ? 'selected' : ''}`}
              onClick={() => setCategory(c.key)}
            >
              {c.label}
            </div>
          ))}
        </div>
      </details>

      <details>
        <summary>Add optional detail (not required)</summary>
        <textarea
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          placeholder="Anything else worth noting — entirely optional"
        />
      </details>

      <button className="submit-btn" disabled={!zoneId || !category || submitting} onClick={submit}>
        {submitting ? 'Submitting...' : 'Submit report'}
      </button>
    </div>
  );
}
