'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import type { LatLngTuple } from 'leaflet';
import { v4 as uuidv4 } from 'uuid';
import { supabaseBrowser } from '@/lib/supabase';

const LocationMapPreview = dynamic(
  async () => {
    const { MapContainer, Marker, TileLayer, useMap } = await import('react-leaflet');

    function PreviewMap({
      position,
      onMove,
    }: {
      position: LatLngTuple;
      onMove: (lat: number, lng: number) => void;
    }) {
      function MapPositionController() {
        const map = useMap();

        useEffect(() => {
          map.setView(position);
        }, [map, position]);

        return null;
      }

      function MapClickController() {
        const map = useMap();

        useEffect(() => {
          const handleClick = (event: { latlng: { lat: number; lng: number } }) => {
            onMove(event.latlng.lat, event.latlng.lng);
          };

          map.on('click', handleClick);
          return () => {
            map.off('click', handleClick);
          };
        }, [map, onMove]);

        return null;
      }

      return (
        <MapContainer
          center={position}
          zoom={14}
          scrollWheelZoom={false}
          style={{ height: '220px', width: '100%' }}
        >
          <MapPositionController />
          <MapClickController />
          <TileLayer
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
          />
          <Marker
            position={position}
            draggable
            eventHandlers={{
              dragend: (event) => {
                const target = event.target as { getLatLng: () => { lat: number; lng: number } };
                const { lat, lng } = target.getLatLng();
                onMove(lat, lng);
              },
            }}
          />
        </MapContainer>
      );
    }

    return PreviewMap;
  },
  { ssr: false }
);

type Zone = { id: string; name: string; latitude: number; longitude: number };

type ReportLocation = {
  lat: number;
  lng: number;
};

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

const DEFAULT_CENTER: LatLngTuple = [19.2, 72.9];

function haversineKm(a: ReportLocation, b: ReportLocation) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const latDelta = toRad(b.lat - a.lat);
  const lngDelta = toRad(b.lng - a.lng);
  const latA = toRad(a.lat);
  const latB = toRad(b.lat);

  const hav =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(latA) * Math.cos(latB) * Math.sin(lngDelta / 2) ** 2;

  return 2 * 6371 * Math.asin(Math.sqrt(hav));
}

function nearestZone(zones: Zone[], lat: number, lng: number) {
  if (!zones.length) return null;

  let closest = zones[0];
  let minDistance = Number.POSITIVE_INFINITY;

  for (const zone of zones) {
    const distance = haversineKm({ lat, lng }, { lat: zone.latitude, lng: zone.longitude });
    if (distance < minDistance) {
      minDistance = distance;
      closest = zone;
    }
  }

  return { zone: closest, distanceKm: minDistance };
}

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
  const [zonesLoading, setZonesLoading] = useState(true);
  const [zonesError, setZonesError] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [category, setCategory] = useState('');
  const [detail, setDetail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [refId, setRefId] = useState<string | null>(null);
  const [locationStatus, setLocationStatus] = useState('');
  const [formError, setFormError] = useState('');
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle');
  const [mapPosition, setMapPosition] = useState<LatLngTuple>(DEFAULT_CENTER);

  useEffect(() => {
    async function loadZones() {
      try {
        const { data, error } = await supabaseBrowser
          .from('zones')
          .select('id, name, latitude, longitude');
        if (error) {
          setZonesError('Locations could not be loaded. Please refresh and try again.');
          return;
        }
        const nextZones = (data as Zone[]) || [];
        setZones(nextZones);

        if (nextZones.length > 0) {
          const first = nextZones[0];
          setZoneId(first.id);
          setMapPosition([first.latitude, first.longitude]);
        }
      } catch {
        setZonesError('Locations could not be loaded. Please refresh and try again.');
      } finally {
        setZonesLoading(false);
      }
    }

    loadZones();
  }, []);

  async function submit() {
    if (!zoneId || !category || submitting) return;
    setSubmitting(true);
    setFormError('');
    const reporter_token = getReporterToken();

    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zone_id: zoneId,
          category,
          detail,
          reporter_token,
          latitude: mapPosition[0],
          longitude: mapPosition[1],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'The report could not be submitted.');
      }
      setRefId(data.report_ref_id || 'SUBMITTED');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'The report could not be submitted. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function copyRefId() {
    if (!refId) return;
    try {
      await navigator.clipboard.writeText(refId);
      setCopyState('copied');
      window.setTimeout(() => setCopyState('idle'), 2000);
    } catch {
      setCopyState('idle');
    }
  }

  function selectZoneById(id: string) {
    setZoneId(id);
    const matchedZone = zones.find((zone) => zone.id === id);
    if (matchedZone) {
      setMapPosition([matchedZone.latitude, matchedZone.longitude]);
    }
  }

  function handleUseMyLocation() {
    if (!navigator.geolocation) {
      setLocationStatus('Location access is unavailable in this browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const found = nearestZone(zones, coords.latitude, coords.longitude);

        if (!found) {
          setLocationStatus('No nearby zones are available yet.');
          return;
        }

        const { zone } = found;
        setZoneId(zone.id);
        setMapPosition([coords.latitude, coords.longitude]);
        setLocationStatus(`Exact position found. Reporting area: ${zone.name}`);
      },
      () => {
        setLocationStatus('Location access was denied. You can still choose a zone manually.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function handleMapMove(lat: number, lng: number) {
    setMapPosition([lat, lng]);
    const found = nearestZone(zones, lat, lng);

    if (found) {
      setZoneId(found.zone.id);
      setLocationStatus(`Pin adjusted to ${found.zone.name}`);
      return;
    }

    setLocationStatus('Pin moved manually. Choose the closest known location to confirm.');
  }

  function reset() {
    setCategory('');
    setDetail('');
    setRefId(null);
    setCopyState('idle');
    setLocationStatus('');
    setFormError('');
    if (zones[0]) {
      setZoneId(zones[0].id);
      setMapPosition([zones[0].latitude, zones[0].longitude]);
    }
  }

  if (refId) {
    return (
      <div className="container">
        <div className="confirmation">
          <div className="success-mark" aria-hidden="true">✓</div>
          <h1>Report received</h1>
          <p className="subtitle">Thank you. No further action is needed from you.</p>
          <div className="ref-id-row">
            <div className="ref-id">{refId}</div>
            <button type="button" className="copy-id-btn" onClick={copyRefId} aria-label="Copy report ID">
              {copyState === 'copied' ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <p className="subtitle">Keep this if you want to reference it later.</p>
          <button type="button" className="reset-link" onClick={reset}>
            File another report
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-kicker">Private by design</div>
      <h1>Flag a moment</h1>
      <p className="subtitle">Share a place-based safety concern in under a minute. No account, name, or contact details needed.</p>

      <div className="trust-strip">
        <span>Anonymous</span><span>•</span><span>Place-based</span><span>•</span><span>Optional detail</span>
      </div>

      <div className="location-controls">
        <div>
          <div className="field-label">Where did this happen?</div>
          <div className="field-help">Choose a nearby area, then tap or drag the pin to the exact spot.</div>
        </div>
        <button type="button" className="ghost-btn" onClick={handleUseMyLocation} disabled={zonesLoading || !zones.length}>
          Use my location
        </button>
      </div>

      {locationStatus ? <p className="location-status">{locationStatus}</p> : null}

      {zonesLoading ? <div className="loading-panel"><span className="inline-spinner" /> Loading nearby locations...</div> : null}
      {zonesError ? <div className="error-panel" role="alert">{zonesError}</div> : null}
      {!zonesLoading && !zonesError && !zones.length ? <div className="empty-panel">No reporting locations have been configured yet.</div> : null}

      <select aria-label="Reporting location" value={zoneId} onChange={(e) => selectZoneById(e.target.value)} disabled={zonesLoading || !zones.length}>
        <option value="">Select location...</option>
        {zones.map((z) => (
          <option key={z.id} value={z.id}>
            {z.name}
          </option>
        ))}
      </select>

      <div className="location-map-preview">
        <LocationMapPreview position={mapPosition} onMove={handleMapMove} />
      </div>

      <div className="chip-grid">
        <div className="section-label">What best describes it?</div>
        {AMBIENT_CATEGORIES.map((c) => (
          <button
            key={c.key}
            type="button"
            className={`chip ${category === c.key ? 'selected' : ''}`}
            onClick={() => setCategory(c.key)}
          >
            {c.label}
          </button>
        ))}
      </div>

      <details>
        <summary>Something more serious?</summary>
        <div className="chip-grid serious-grid">
          {SERIOUS_CATEGORIES.map((c) => (
            <button
              key={c.key}
              type="button"
              className={`chip serious ${category === c.key ? 'selected' : ''}`}
              onClick={() => setCategory(c.key)}
            >
              {c.label}
            </button>
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

      <button
        type="button"
        className="submit-btn"
        disabled={!zoneId || !category || submitting}
        onClick={submit}
      >
        {submitting ? (
          <span className="button-loading-content">
            <span className="button-spinner" aria-hidden="true" />
            Submitting...
          </span>
        ) : (
          'Submit report'
        )}
      </button>
      {formError ? <div className="error-panel form-error" role="alert">{formError}</div> : null}
    </div>
  );
}
