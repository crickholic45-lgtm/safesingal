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
  watch: '#d9a64a',
  elevated: '#df7a3a',
  urgent: '#c95d45',
  immediate: '#a63d3d',
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
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
        {withCoords.map((a) => (
          <CircleMarker
            key={a.id}
            center={[a.zones!.latitude, a.zones!.longitude]}
            radius={12}
            pathOptions={{
              color: TIER_COLOR[a.tier] || '#c96d3d',
              fillColor: TIER_COLOR[a.tier] || '#c96d3d',
              fillOpacity: 0.75,
              weight: 2,
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
