import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

/** Ensures Leaflet recalculates size after layout (fixes blank map in flex/hidden containers). */
export default function MapInvalidator() {
  const map = useMap();

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      map.invalidateSize();
    });
    const t = window.setTimeout(() => map.invalidateSize(), 200);
    return () => {
      cancelAnimationFrame(id);
      window.clearTimeout(t);
    };
  }, [map]);

  return null;
}
