import { useEffect, useRef, useState } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

function makeIcon(status) {
  const emergency = status === 'Emergency';
  const delayed = status === 'Delayed';
  const cls = emergency ? 'emergency' : delayed ? 'delayed' : '';
  const html = `<div class="custom-bus-marker ${cls} bus-marker-animated">
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6v6"/><path d="M15 6v6"/><path d="M2.5 13h19"/><path d="M20.5 16h-17"/><rect x="4" y="3" width="16" height="16" rx="2"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>
  </div>`;
  return L.divIcon({
    html,
    className: 'bus-marker-icon',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

export default function AnimatedBusMarker({
  bus,
  position,
  zIndexOffset = 0,
  showPopup = false,
}) {
  const [display, setDisplay] = useState(position);
  const fromRef = useRef(position);
  const targetLat = position?.[0];
  const targetLng = position?.[1];

  useEffect(() => {
    if (targetLat == null || targetLng == null) return;
    const from = fromRef.current || [targetLat, targetLng];
    let step = 0;
    const maxSteps = 18;
    let id;

    const tick = () => {
      step += 1;
      const t = Math.min(1, step / maxSteps);
      const ease = 1 - (1 - t) ** 3;
      setDisplay([
        lerp(from[0], targetLat, ease),
        lerp(from[1], targetLng, ease),
      ]);
      if (t < 1) id = requestAnimationFrame(tick);
      else fromRef.current = [targetLat, targetLng];
    };

    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [targetLat, targetLng]);

  if (!display) return null;

  return (
    <Marker position={display} icon={makeIcon(bus?.status)} zIndexOffset={zIndexOffset}>
      {showPopup && (
        <Popup>
          <div style={{ color: '#0f172a', minWidth: 120 }}>
            <strong>Bus {bus?.bus_id}</strong>
            <div>Route {bus?.assigned_route_id ?? '—'}</div>
            <div>{bus?.status || '—'}</div>
          </div>
        </Popup>
      )}
    </Marker>
  );
}
