import { supabase } from './supabase';

/** Normalize route.stops from strings, JSON string, or { name } objects */
export function getStopLabels(stops) {
  if (stops == null) return [];
  if (typeof stops === 'string') {
    try {
      return getStopLabels(JSON.parse(stops));
    } catch {
      return [];
    }
  }
  if (!Array.isArray(stops)) return [];
  return stops
    .map((s) =>
      typeof s === 'string' ? s : s?.name ?? s?.stop_name ?? s?.label ?? ''
    )
    .filter(Boolean);
}

export function getOrderedStops(routeData, trip_type) {
  if (!routeData) return [];
  const labels = getStopLabels(routeData.stops);
  if (trip_type === 'evening') return [...labels].reverse();
  return labels;
}

export function secondsSinceUpdate(last_updated) {
  if (last_updated == null) return null;
  const ms =
    typeof last_updated === 'string'
      ? Date.parse(last_updated)
      : typeof last_updated === 'number'
        ? last_updated
        : NaN;
  if (Number.isNaN(ms)) return null;
  return Math.max(0, Math.floor((Date.now() - ms) / 1000));
}

export function buildNextStopsAndEtas(currentStop, orderedStops, minutesPerLeg = 12) {
  const idx = orderedStops.indexOf(currentStop);
  const from = idx === -1 ? 0 : idx + 1;
  const next = orderedStops.slice(from, from + 6);
  const times = next.map((_, i) => {
    const mins = (i + 1) * minutesPerLeg;
    if (mins < 60) return `~${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m ? `~${h}h ${m}m` : `~${h}h`;
  });
  return { next_stops: next, estimated_times: times };
}

export async function fetchInitialData() {
  if (!supabase) return { buses: [], routes: [], drivers: [] };

  const [buses, routes, drivers] = await Promise.all([
    supabase.from('buses').select('*'),
    supabase.from('routes').select('*'),
    supabase.from('drivers').select('*'),
  ]);

  return {
    buses: buses.data || [],
    routes: routes.data || [],
    drivers: drivers.data || [],
  };
}

export function subscribeToDB(callback, options = {}) {
  const pollMs = options.pollMs ?? 12000;

  if (!supabase) {
    callback({ buses: [], routes: [], drivers: [] });
    return () => {};
  }

  let currentDb = { buses: [], routes: [], drivers: [] };
  let unsubscribed = false;

  const loadData = async () => {
    currentDb = await fetchInitialData();
    if (!unsubscribed) callback({ ...currentDb });
  };

  loadData();

  const poll = setInterval(() => {
    loadData();
  }, pollMs);

  const busChannel = supabase
    .channel('buses_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'buses' },
      async () => {
        currentDb.buses = (await supabase.from('buses').select('*')).data || [];
        if (!unsubscribed) callback({ ...currentDb });
      }
    )
    .subscribe();

  const otherChannel = supabase
    .channel('other_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'routes' },
      async () => {
        currentDb.routes = (await supabase.from('routes').select('*')).data || [];
        if (!unsubscribed) callback({ ...currentDb });
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'drivers' },
      async () => {
        currentDb.drivers = (await supabase.from('drivers').select('*')).data || [];
        if (!unsubscribed) callback({ ...currentDb });
      }
    )
    .subscribe();

  return () => {
    unsubscribed = true;
    clearInterval(poll);
    supabase.removeChannel(busChannel);
    supabase.removeChannel(otherChannel);
  };
}

async function tryInsertLocationHistory(bus_id, lat, lng) {
  if (!supabase) return;
  const { error } = await supabase.from('location_history').insert({
    bus_id,
    lat,
    lng,
    timestamp: new Date().toISOString(),
  });
  if (error && import.meta.env.DEV) console.debug('location_history:', error.message);
}

export async function updateBusLocation(bus_id, updates) {
  if (!supabase) return { error: 'no client' };
  const payload = { ...updates, last_updated: new Date().toISOString() };
  return supabase.from('buses').update(payload).eq('bus_id', bus_id);
}

export async function emergencyReassignRoute(old_bus_id, new_bus_id, route_id) {
  if (!supabase) return { error: 'no client' };

  if (old_bus_id) {
    await supabase.from('buses').update({ assigned_route_id: null }).eq('bus_id', old_bus_id);
  }
  if (new_bus_id) {
    await supabase.from('buses').update({ assigned_route_id: route_id }).eq('bus_id', new_bus_id);
  }
  return { ok: true };
}

let geoWatchId = null;
let lastGeoSent = 0;
const GEO_THROTTLE_MS = 18000;

function throttledSend(bus_id, lat, lng) {
  const now = Date.now();
  if (now - lastGeoSent < GEO_THROTTLE_MS) return;
  lastGeoSent = now;
  updateBusLocation(bus_id, { current_lat: lat, current_lng: lng });
  tryInsertLocationHistory(bus_id, lat, lng);
}

export function startDriverTracking(bus_id, trip_type) {
  stopDriverTrackingInner();

  updateBusLocation(bus_id, {
    trip_active: true,
    trip_type,
    status: 'On Time',
  });

  if (!navigator.geolocation) {
    console.warn('Geolocation not supported; use manual stop selection.');
    return;
  }

  const startWatch = (highAccuracy) => {
    geoWatchId = navigator.geolocation.watchPosition(
      (position) => {
        throttledSend(
          bus_id,
          position.coords.latitude,
          position.coords.longitude
        );
      },
      () => {
        if (highAccuracy && geoWatchId != null) {
          navigator.geolocation.clearWatch(geoWatchId);
          geoWatchId = null;
          startWatch(false);
        }
      },
      {
        enableHighAccuracy: highAccuracy,
        maximumAge: 25000,
        timeout: 25000,
      }
    );
  };

  startWatch(true);
}

function stopDriverTrackingInner() {
  if (geoWatchId != null) {
    navigator.geolocation.clearWatch(geoWatchId);
    geoWatchId = null;
  }
  lastGeoSent = 0;
}

export function stopDriverTracking(bus_id) {
  stopDriverTrackingInner();
  if (bus_id != null) updateBusLocation(bus_id, { trip_active: false });
}

export const autoDetectTripType = () => {
  const currentHour = new Date().getHours();
  if (currentHour >= 5 && currentHour < 12) return 'morning';
  return 'evening';
};
