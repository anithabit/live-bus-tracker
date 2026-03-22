import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import MapInvalidator from '../components/MapInvalidator';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import {
  subscribeToDB,
  getOrderedStops,
  buildNextStopsAndEtas,
  secondsSinceUpdate,
} from '../lib/store';
import {
  Clock,
  MapPin,
  Route,
  BusFront,
  ArrowRight,
  AlertTriangle,
  Loader,
  LogOut,
  Navigation,
  Map,
  LayoutGrid,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate, useLocation } from 'react-router-dom';
import AnimatedBusMarker from '../components/AnimatedBusMarker';
import MapFitBounds from '../components/MapFitBounds';
import BackNavButton from '../components/BackNavButton';

const CARTO_DARK =
  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

const DEFAULT_CENTER = [28.6139, 77.209];

function statusDotClass(bus) {
  if (bus.status === 'Emergency') return 'glow-emergency';
  if (bus.status === 'Delayed') return 'glow-delayed';
  if (bus.trip_active && (bus.status === 'On Time' || !bus.status)) return 'glow-pulse';
  return 'glow-ontime';
}

function statusColor(status) {
  if (status === 'Emergency') return 'var(--status-emergency)';
  if (status === 'Delayed') return 'var(--status-delayed)';
  return 'var(--status-ontime)';
}

export default function StudentMap() {
  const [db, setDb] = useState({ buses: [], routes: [], drivers: [] });
  const [selectedBus, setSelectedBus] = useState(null);
  const [view, setView] = useState('shell');
  const [tripFilter, setTripFilter] = useState('morning');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const shellTab = useMemo(() => {
    if (location.pathname === '/student/map') return 'map';
    if (location.pathname === '/student') {
      const tab = new URLSearchParams(location.search).get('tab');
      return tab === 'info' ? 'info' : 'buses';
    }
    return 'buses';
  }, [location.pathname, location.search]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  useEffect(() => {
    const unsubscribe = subscribeToDB((newDb) => {
      setDb(newDb);
      setLoading(false);
      setSelectedBus((prev) => {
        if (!prev) return null;
        return newDb.buses.find((b) => b.bus_id === prev.bus_id) || prev;
      });
    });
    return unsubscribe;
  }, []);

  const sortedBuses = useMemo(
    () => [...db.buses].sort((a, b) => String(a.bus_id).localeCompare(String(b.bus_id), undefined, { numeric: true })),
    [db.buses]
  );

  const getRouteInfo = (route_id) => db.routes.find((r) => r.route_id === route_id) || { stops: [] };

  const openBus = (bus) => {
    setSelectedBus(bus);
    setView('detail');
  };

  const fleetPositions = useMemo(() => {
    return sortedBuses
      .filter((b) => b.current_lat != null && b.current_lng != null)
      .map((b) => [b.current_lat, b.current_lng]);
  }, [sortedBuses]);

  const renderBusCard = (bus, opts = {}) => {
    const { compact } = opts;
    const routeInfo = getRouteInfo(bus.assigned_route_id);
    const orderedStops = getOrderedStops(routeInfo, bus.trip_type || tripFilter);
    const derived = buildNextStopsAndEtas(bus.current_stop, orderedStops);
    const nextList = Array.isArray(bus.next_stops) && bus.next_stops.length ? bus.next_stops : derived.next_stops;
    const etaList =
      Array.isArray(bus.estimated_times) && bus.estimated_times.length
        ? bus.estimated_times
        : derived.estimated_times;
    const nextStop = nextList[0] || '—';
    const eta = etaList[0] || '—';
    const sec = secondsSinceUpdate(bus.last_updated);

    return (
      <Motion.div
        key={bus.bus_id}
        layout
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="glass-card student-bus-card"
        style={{
          cursor: 'pointer',
          padding: compact ? '16px' : '20px',
          border: `1px solid ${bus.trip_active ? 'rgba(6, 182, 212, 0.35)' : 'rgba(255,255,255,0.08)'}`,
        }}
        onClick={() => openBus(bus)}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                background: bus.status === 'Emergency' ? 'var(--grad-alert)' : 'var(--grad-map)',
                padding: 12,
                borderRadius: 14,
                boxShadow: '0 0 20px rgba(6, 182, 212, 0.35)',
              }}
            >
              <BusFront size={24} color="white" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: compact ? '1.05rem' : '1.15rem', fontWeight: 800 }}>
                Bus {bus.bus_id}
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                {routeInfo.route_name || `Route ${bus.assigned_route_id ?? '—'}`}
              </p>
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(255,255,255,0.06)',
              padding: '6px 12px',
              borderRadius: 20,
            }}
          >
            <div className={statusDotClass(bus)} />
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: statusColor(bus.status) }}>
              {bus.trip_active ? bus.status || 'Live' : 'Idle'}
            </span>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 10,
            marginTop: 14,
            background: 'rgba(0,0,0,0.22)',
            padding: 12,
            borderRadius: 14,
          }}
        >
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Current stop</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{bus.current_stop || (bus.trip_active ? 'Updating…' : '—')}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Next stop</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{nextStop}</div>
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>ETA next</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#67e8f9' }}>{eta}</div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)' }}>
            {sec != null ? `Updated ${sec}s ago` : 'No timestamp'}
          </span>
          <button
            type="button"
            className="btn btn-map"
            style={{ padding: '10px 16px', fontSize: '0.85rem' }}
            onClick={(e) => {
              e.stopPropagation();
              openBus(bus);
            }}
          >
            Live map <ArrowRight size={16} style={{ marginLeft: 6 }} />
          </button>
        </div>
      </Motion.div>
    );
  };

  if (loading) {
    return (
      <div
        style={{
          padding: 40,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          gap: 20,
          background: 'var(--bg-dark)',
        }}
      >
        <Loader size={48} color="#22d3ee" className="loading-orbit" />
        <h2 className="title-gradient" style={{ textAlign: 'center' }}>
          Syncing fleet from Supabase…
        </h2>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', width: '100%', position: 'relative', overflow: 'hidden' }}>
      <AnimatePresence mode="wait">
        {view === 'shell' && (
          <Motion.div
            key="shell"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="scroll-area flex-container-column"
            style={{
              position: 'absolute',
              inset: 0,
              background: 'var(--bg-dark)',
              zIndex: 10,
              paddingBottom: 100,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                {shellTab === 'map' && (
                  <BackNavButton label="Back to bus list" onClick={() => navigate('/student')} />
                )}
                {shellTab === 'info' && (
                  <BackNavButton label="Back to bus list" onClick={() => navigate('/student')} />
                )}
                <h1 className="title-gradient" style={{ fontSize: '1.75rem', margin: 0, fontWeight: 800 }}>
                  Live fleet
                </h1>
              </div>
              <button className="btn btn-alert" style={{ padding: '8px 14px', fontSize: '0.85rem' }} onClick={handleLogout}>
                <LogOut size={16} style={{ marginRight: 6 }} /> Logout
              </button>
            </div>

            {shellTab === 'buses' && (
              <>
                <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
                  <button
                    type="button"
                    className={`btn glass ${tripFilter === 'morning' ? 'btn-primary' : ''}`}
                    style={{ flex: 1 }}
                    onClick={() => setTripFilter('morning')}
                  >
                    Morning context
                  </button>
                  <button
                    type="button"
                    className={`btn glass ${tripFilter === 'evening' ? 'btn-primary' : ''}`}
                    style={{ flex: 1 }}
                    onClick={() => setTripFilter('evening')}
                  >
                    Evening context
                  </button>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 16 }}>
                  All {sortedBuses.length} buses — route is the source of truth for tracking. Tap a card for full-screen live map.
                </p>
                <div className="grid grid-cols-2" style={{ gap: 14 }}>
                  {sortedBuses.map((bus) => renderBusCard(bus))}
                </div>
              </>
            )}

            {shellTab === 'map' && (
              <div className="student-fleet-map-wrap" style={{ marginBottom: 12 }}>
                <MapContainer center={DEFAULT_CENTER} zoom={12} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                  <MapInvalidator />
                  <TileLayer attribution="&copy; OpenStreetMap & CARTO" url={CARTO_DARK} />
                  <MapFitBounds positions={fleetPositions.length ? fleetPositions : [DEFAULT_CENTER]} />
                  {sortedBuses.map((bus) => {
                    if (bus.current_lat == null || bus.current_lng == null) return null;
                    return (
                      <AnimatedBusMarker
                        key={bus.bus_id}
                        bus={bus}
                        position={[bus.current_lat, bus.current_lng]}
                        zIndexOffset={600}
                        showPopup
                      />
                    );
                  })}
                </MapContainer>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 10 }}>
                  Markers use live Supabase data (realtime + ~12s refresh). Buses without GPS yet are hidden from the map.
                </p>
              </div>
            )}

            {shellTab === 'info' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="glass-card">
                  <h3 style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Route size={20} /> Routes
                  </h3>
                  {db.routes.map((route) => {
                    const labels = getOrderedStops(route, 'morning');
                    const assigned = sortedBuses.filter((b) => b.assigned_route_id === route.route_id).map((b) => b.bus_id).join(', ');
                    return (
                      <div
                        key={route.route_id}
                        style={{
                          padding: '12px 0',
                          borderBottom: '1px solid rgba(255,255,255,0.06)',
                        }}
                      >
                        <div style={{ fontWeight: 700 }}>{route.route_name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>{labels.join(' → ')}</div>
                        <div style={{ fontSize: '0.78rem', marginTop: 6, color: '#86efac' }}>Buses: {assigned || 'None'}</div>
                      </div>
                    );
                  })}
                </div>
                <div className="glass-card">
                  <h3 style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <BusFront size={20} /> Drivers
                  </h3>
                  {(db.drivers || []).map((driver) => (
                    <div
                      key={driver.driver_id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '12px 0',
                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700 }}>{driver.name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          ID {driver.driver_id} · {driver.phone_number || driver.phone || '—'}
                        </div>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#67e8f9', fontWeight: 600 }}>Bus {driver.assigned_bus_id ?? '—'}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <nav className="bottom-nav bottom-nav-gradient">
              <button
                type="button"
                className={`nav-item ${shellTab === 'buses' ? 'active' : ''}`}
                onClick={() => navigate('/student')}
              >
                <LayoutGrid size={22} />
                <span>Buses</span>
              </button>
              <button
                type="button"
                className={`nav-item ${shellTab === 'map' ? 'active' : ''}`}
                onClick={() => navigate('/student/map')}
              >
                <Map size={22} />
                <span>Live map</span>
              </button>
              <button
                type="button"
                className={`nav-item ${shellTab === 'info' ? 'active' : ''}`}
                onClick={() => navigate('/student?tab=info')}
              >
                <Navigation size={22} />
                <span>Routes</span>
              </button>
            </nav>
          </Motion.div>
        )}

        {view === 'detail' && selectedBus && (
          <Motion.div
            key="detail"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            style={{ position: 'absolute', inset: 0, zIndex: 20 }}
          >
            <div
              className="glass"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '14px 18px',
                zIndex: 1000,
                position: 'absolute',
                top: 10,
                left: 10,
                right: 10,
                borderRadius: 16,
              }}
            >
              <BackNavButton label="Back" onClick={() => setView('shell')} />
              <div>
                <h2 className="title-gradient" style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                  Route {selectedBus.assigned_route_id ?? '—'}
                </h2>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Bus {selectedBus.bus_id}</p>
              </div>
            </div>

            <div className="student-detail-map-wrap">
              <MapContainer
                center={
                  selectedBus.current_lat != null && selectedBus.current_lng != null
                    ? [selectedBus.current_lat, selectedBus.current_lng]
                    : DEFAULT_CENTER
                }
                zoom={14}
                style={{ height: '100%', width: '100%', zIndex: 1 }}
                zoomControl={false}
              >
                <MapInvalidator />
                <TileLayer attribution="&copy; OpenStreetMap & CARTO" url={CARTO_DARK} />
                {selectedBus.current_lat != null && selectedBus.current_lng != null && (
                  <AnimatedBusMarker
                    bus={selectedBus}
                    position={[selectedBus.current_lat, selectedBus.current_lng]}
                    zIndexOffset={1000}
                  />
                )}
              </MapContainer>
            </div>

            <Motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              transition={{ type: 'spring', damping: 28 }}
              className="glass-card scroll-area"
              style={{
                position: 'absolute',
                bottom: 16,
                left: 10,
                right: 10,
                zIndex: 1000,
                padding: 20,
                maxHeight: '52vh',
                overflowY: 'auto',
                border: `1px solid ${
                  selectedBus.status === 'Emergency'
                    ? 'var(--status-emergency)'
                    : selectedBus.status === 'Delayed'
                      ? 'var(--status-delayed)'
                      : 'rgba(255,255,255,0.12)'
                }`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      background: selectedBus.status === 'Emergency' ? 'var(--grad-alert)' : 'var(--grad-map)',
                      padding: 10,
                      borderRadius: 12,
                    }}
                  >
                    <BusFront size={24} color="white" />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{getRouteInfo(selectedBus.assigned_route_id).route_name || 'Route'}</h3>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>Physical bus {selectedBus.bus_id}</p>
                  </div>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    background: 'rgba(0,0,0,0.35)',
                    padding: '6px 12px',
                    borderRadius: 20,
                  }}
                >
                  <div className={statusDotClass(selectedBus)} />
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: statusColor(selectedBus.status) }}>
                    {selectedBus.status || '—'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div className="glass" style={{ padding: 12, borderRadius: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                    <MapPin size={14} /> Current stop
                  </div>
                  <strong style={{ fontSize: '0.95rem' }}>{selectedBus.current_stop || '—'}</strong>
                </div>
                <div className="glass" style={{ padding: 12, borderRadius: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                    <Clock size={14} /> ETA next
                  </div>
                  <strong style={{ fontSize: '0.95rem' }}>
                    {(Array.isArray(selectedBus.estimated_times) && selectedBus.estimated_times[0]) ||
                      buildNextStopsAndEtas(selectedBus.current_stop, getOrderedStops(getRouteInfo(selectedBus.assigned_route_id), selectedBus.trip_type || 'morning')).estimated_times[0] ||
                      '—'}
                  </strong>
                </div>
              </div>

              <h4 style={{ fontSize: '0.95rem', marginBottom: 12, color: 'rgba(255,255,255,0.85)' }}>Upcoming stops</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {(() => {
                  const routeInfo = getRouteInfo(selectedBus.assigned_route_id);
                  const orderedStops = getOrderedStops(routeInfo, selectedBus.trip_type || 'morning');
                  const currentStopIndex = orderedStops.indexOf(selectedBus.current_stop);

                  return orderedStops.map((stop, index) => {
                    const isCompleted = currentStopIndex !== -1 && index < currentStopIndex;
                    const isCurrent = currentStopIndex !== -1 && index === currentStopIndex;
                    const isUpcoming = currentStopIndex === -1 || index > currentStopIndex;

                    return (
                      <div key={`${stop}-${index}`} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, minHeight: 48 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          {index > 0 && (
                            <div
                              style={{
                                width: 2,
                                height: 28,
                                marginBottom: 4,
                                background: isCompleted || isCurrent ? 'var(--status-ontime)' : 'rgba(255,255,255,0.15)',
                              }}
                            />
                          )}
                          <div
                            style={{
                              width: 14,
                              height: 14,
                              borderRadius: '50%',
                              background: isCurrent ? 'var(--grad-map)' : isCompleted ? 'rgba(255,255,255,0.25)' : 'transparent',
                              border: isCurrent ? '2px solid white' : `2px solid ${isUpcoming ? 'rgba(255,255,255,0.25)' : 'transparent'}`,
                              boxShadow: isCurrent ? '0 0 14px rgba(34, 211, 238, 0.9)' : 'none',
                            }}
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <span
                            style={{
                              fontSize: isCurrent ? '1rem' : '0.9rem',
                              fontWeight: isCurrent ? 800 : 500,
                              color: isCompleted ? 'var(--text-muted)' : 'white',
                              textDecoration: isCompleted ? 'line-through' : 'none',
                            }}
                          >
                            {stop}
                          </span>
                          {isCurrent && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--status-ontime)', marginTop: 2 }}>Bus at this stop</div>
                          )}
                          {isUpcoming && currentStopIndex !== -1 && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                              Est. ~{(index - currentStopIndex) * 12} min
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

              {selectedBus.status === 'Emergency' && (
                <div
                  className="glass"
                  style={{
                    marginTop: 16,
                    padding: 14,
                    borderRadius: 12,
                    border: '1px solid rgba(239, 68, 68, 0.5)',
                    display: 'flex',
                    gap: 10,
                    alignItems: 'center',
                    background: 'rgba(239, 68, 68, 0.12)',
                  }}
                >
                  <AlertTriangle color="#fca5a5" size={22} />
                  <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>Emergency reported — follow college announcements.</span>
                </div>
              )}
            </Motion.div>
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
