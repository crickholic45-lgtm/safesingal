'use client';

import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

type AlertRow = {
  id: string;
  score: number;
  tier: string;
  zones: { name: string; latitude: number; longitude: number } | null;
};

const TIER_COLOR: Record<string, string> = {
  watch: '#ffd166',
  elevated: '#ff9f43',
  urgent: '#ff5c6c',
  immediate: '#ff2d55',
};

export default function ZoneMap({ alerts }: { alerts: AlertRow[] }) {
  const withCoords = alerts.filter((a) => a.zones);
  const center: [number, number] =
    withCoords.length > 0
      ? [withCoords[0].zones!.latitude, withCoords[0].zones!.longitude]
      : [19.2, 72.9];

  return (
    <div className="map-wrap">
      <MapContainer center={center} zoom={11} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; OpenStreetMap contributors &copy; CARTO'
        />
        {withCoords.map((a) => (
          <CircleMarker
            key={a.id}
            center={[a.zones!.latitude, a.zones!.longitude]}
            radius={12}
            pathOptions={{
              color: TIER_COLOR[a.tier] || '#7c8cff',
              fillColor: TIER_COLOR[a.tier] || '#7c8cff',
              fillOpacity: 0.7,
            }}
          >
            <Popup>
              <strong>{a.zones!.name}</strong>
              <br />
              {a.tier} — score {a.score?.toFixed(2)}
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
