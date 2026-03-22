import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

export default function MapFitBounds({ positions, padding = [40, 40] }) {
  const map = useMap();

  useEffect(() => {
    const valid = (positions || []).filter(
      (p) => p && typeof p[0] === 'number' && typeof p[1] === 'number'
    );
    if (valid.length === 0) return;
    if (valid.length === 1) {
      map.setView(valid[0], 14, { animate: true });
      return;
    }
    const b = L.latLngBounds(valid);
    map.fitBounds(b, { padding, animate: true, maxZoom: 15 });
  }, [map, positions, padding]);

  return null;
}
