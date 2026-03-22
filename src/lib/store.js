import { supabase } from './supabase';

export async function fetchInitialData() {
  if (!supabase) return { buses: [], routes: [], drivers: [] };
  
  const [buses, routes, drivers] = await Promise.all([
    supabase.from('buses').select('*'),
    supabase.from('routes').select('*'),
    supabase.from('drivers').select('*')
  ]);
  
  return {
    buses: buses.data || [],
    routes: routes.data || [],
    drivers: drivers.data || []
  };
}

export function subscribeToDB(callback) {
  if (!supabase) {
    callback({ buses: [], routes: [], drivers: [] });
    return () => {};
  }
  
  let currentDb = { buses: [], routes: [], drivers: [] };

  const loadData = async () => {
    currentDb = await fetchInitialData();
    callback({...currentDb});
  };
  loadData();

  // Realtime subscription to buses table
  const busChannel = supabase
    .channel('buses_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'buses' }, async (payload) => {
      // Re-fetch or optimally update list. A refetch ensures consistency safely for a prototype.
      currentDb.buses = (await supabase.from('buses').select('*')).data || [];
      callback({...currentDb});
    })
    .subscribe();

  const otherChannel = supabase
    .channel('other_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'routes' }, async () => {
      currentDb.routes = (await supabase.from('routes').select('*')).data || [];
      callback({...currentDb});
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'drivers' }, async () => {
      currentDb.drivers = (await supabase.from('drivers').select('*')).data || [];
      callback({...currentDb});
    })
    .subscribe();

  return () => {
    supabase.removeChannel(busChannel);
    supabase.removeChannel(otherChannel);
  };
}

export async function updateBusLocation(bus_id, updates) {
  if (!supabase) return;
  await supabase.from('buses').update({ ...updates, last_updated: new Date().toISOString() }).eq('bus_id', bus_id);
}

export async function emergencyReassignRoute(old_bus_id, new_bus_id, route_id) {
  if (!supabase) return;
  if(old_bus_id) await supabase.from('buses').update({ assigned_route_id: null }).eq('bus_id', old_bus_id);
  if(new_bus_id) await supabase.from('buses').update({ assigned_route_id: route_id }).eq('bus_id', new_bus_id);
}

// GPS implementation tracking
let myLocationInterval = null;

export function startDriverTracking(bus_id, trip_type) {
  if (myLocationInterval) clearInterval(myLocationInterval);
  
  // Update DB immediately on start
  updateBusLocation(bus_id, { trip_active: true, trip_type, status: 'On Time' });

  if (navigator.geolocation) {
    myLocationInterval = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          updateBusLocation(bus_id, {
            current_lat: position.coords.latitude,
            current_lng: position.coords.longitude,
            last_updated: new Date().toISOString()
          });
        },
        (error) => {
          console.error("GPS signal weak / fall back to network", error);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }, 15000);
  } else {
    console.error("Geolocation not supported. Use manual stop updates.");
  }
}

export function stopDriverTracking(bus_id) {
  if(myLocationInterval) clearInterval(myLocationInterval);
  updateBusLocation(bus_id, { trip_active: false });
}

// Just to satisfy the previous mockup API, simulated life is removed
export function simulateLiveMovement() { /* removed per user request */ }

export const autoDetectTripType = () => {
  const currentHour = new Date().getHours();
  // 6AM to 11AM implies morning, else evening conceptually.
  // "Outside 6AM-9AM and 4PM-7PM" logic will be enforced directly in the view
  if (currentHour >= 5 && currentHour < 12) return 'morning';
  return 'evening';
};

export const getOrderedStops = (routeData, trip_type) => {
  if (!routeData || !routeData.stops) return [];
  // Morning: Pickup Points to Campus. Assuming default `stops` ends with Campus
  if (trip_type === 'evening') {
    return [...routeData.stops].reverse();
  }
  return routeData.stops;
};
