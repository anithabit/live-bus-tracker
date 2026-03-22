import React, { useState, useEffect } from 'react';
import {
  subscribeToDB,
  startDriverTracking,
  stopDriverTracking,
  updateBusLocation,
  getOrderedStops,
  buildNextStopsAndEtas,
} from '../lib/store';
import { supabase } from '../lib/supabase';
import {
  Play,
  Square,
  MapPin,
  Navigation,
  Bus,
  AlertCircle,
  Sun,
  Moon,
  LogOut,
  ShieldAlert,
} from 'lucide-react';
import { motion as Motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

export default function DriverPanel() {
  const [db, setDb] = useState({ buses: [], routes: [], drivers: [] });
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showTripDialog, setShowTripDialog] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const initPanel = async () => {
      if (!supabase) {
        setLoading(false);
        return;
      }
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: currentDriver } = await supabase
          .from('drivers')
          .select('*')
          .eq('user_id', session.user.id)
          .maybeSingle();
        setDriver(currentDriver);
      }
      setLoading(false);
    };
    initPanel();

    const unsubscribe = subscribeToDB((data) => setDb(data));
    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <div className="scroll-area" style={{ color: 'white', padding: 24 }}>
        Loading driver workspace…
      </div>
    );
  }
  if (!driver) {
    return (
      <div className="scroll-area" style={{ color: 'white', padding: 24 }}>
        <p>Not linked to a driver profile.</p>
        <button type="button" className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/login')}>
          Back to login
        </button>
      </div>
    );
  }

  const busInfo = db.buses.find((b) => b.bus_id === driver.assigned_bus_id);
  const tripActive = busInfo?.trip_active || false;
  const routeInfo = db.routes.find((r) => r.route_id === busInfo?.assigned_route_id);
  const orderedStops =
    busInfo && routeInfo ? getOrderedStops(routeInfo, busInfo.trip_type || 'morning') : [];

  const startTrip = (trip_type) => {
    setShowTripDialog(false);
    if (busInfo) {
      startDriverTracking(driver.assigned_bus_id, trip_type);
    }
  };

  const endTrip = () => {
    stopDriverTracking(driver.assigned_bus_id);
  };

  const onStopManualChange = async (stop) => {
    const { next_stops, estimated_times } = buildNextStopsAndEtas(stop, orderedStops);
    await updateBusLocation(driver.assigned_bus_id, {
      current_stop: stop,
      next_stops,
      estimated_times,
    });
  };

  return (
    <div className="scroll-area animate-fade-in app-gradient-bg" style={{ flex: 1, overflowY: 'auto', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 className="title-gradient" style={{ fontSize: '1.85rem', fontWeight: 800 }}>
            Driver cockpit
          </h1>
          <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Hello, {driver.name}</p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div className="glass" style={{ padding: 10, borderRadius: '50%' }}>
            <Bus size={24} color="#67e8f9" />
          </div>
          <button
            type="button"
            className="btn glass"
            style={{ padding: '8px 14px', color: 'var(--text-light)', border: '1px solid rgba(255,255,255,0.12)' }}
            onClick={async () => {
              await supabase.auth.signOut();
              navigate('/login');
            }}
          >
            <LogOut size={18} style={{ marginRight: 6 }} /> Logout
          </button>
        </div>
      </div>

      {!busInfo ? (
        <div className="glass-card">
          <p style={{ fontWeight: 600 }}>No bus assigned yet. Ask transport admin to assign your vehicle.</p>
        </div>
      ) : (
        <Motion.div
          className="glass-card"
          style={{ marginBottom: 20, position: 'relative', overflow: 'hidden' }}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {tripActive && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: 4,
                background: 'var(--grad-map)',
                animation: 'pulse 2s infinite',
              }}
            />
          )}
          <h2 style={{ fontSize: '1.35rem', marginBottom: 6, fontWeight: 800 }}>
            Route {busInfo.assigned_route_id ?? '—'}
          </h2>
          <span
            style={{
              fontSize: '0.82rem',
              padding: '5px 10px',
              background: 'rgba(255,255,255,0.08)',
              borderRadius: 20,
              fontWeight: 600,
            }}
          >
            Bus #{driver.assigned_bus_id} ·{' '}
            {busInfo.trip_type && busInfo.trip_active
              ? busInfo.trip_type === 'morning'
                ? 'Morning trip'
                : 'Evening trip'
              : 'Idle'}
          </span>

          <div style={{ display: 'flex', gap: 14, margin: '22px 0' }}>
            <div className="glass" style={{ flex: 1, padding: 16, borderRadius: 14, textAlign: 'center' }}>
              <MapPin size={24} color="var(--text-muted)" style={{ margin: '0 auto 10px' }} />
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>Current stop</div>
              <strong style={{ fontSize: '1rem' }}>{busInfo.current_stop || 'GPS / manual sync…'}</strong>
            </div>

            <div className="glass" style={{ flex: 1, padding: 16, borderRadius: 14, textAlign: 'center' }}>
              <Navigation size={24} color="var(--text-muted)" style={{ margin: '0 auto 10px' }} />
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>Status</div>
              <strong
                style={{
                  fontSize: '1rem',
                  color:
                    busInfo.status === 'Delayed'
                      ? 'var(--status-delayed)'
                      : busInfo.status === 'Emergency'
                        ? 'var(--status-emergency)'
                        : 'var(--status-ontime)',
                }}
              >
                {busInfo.status || '—'}
              </strong>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            {!tripActive ? (
              <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={() => setShowTripDialog(true)}>
                <Play size={18} style={{ marginRight: 8 }} /> Start trip
              </button>
            ) : (
              <button type="button" className="btn btn-alert" style={{ flex: 1 }} onClick={endTrip}>
                <Square size={18} style={{ marginRight: 8 }} /> End trip
              </button>
            )}
          </div>
        </Motion.div>
      )}

      {showTripDialog && (
        <div className="glass-card animate-fade-in" style={{ marginBottom: 20, border: '1px solid rgba(167, 139, 250, 0.45)' }}>
          <h3 style={{ marginBottom: 14, fontWeight: 800 }}>Trip direction</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              type="button"
              className="btn glass"
              style={{ width: '100%', justifyContent: 'flex-start', border: '1px solid rgba(255,255,255,0.1)' }}
              onClick={() => startTrip('morning')}
            >
              <Sun size={18} color="#fbbf24" style={{ marginRight: 10 }} /> Morning (stops → campus)
            </button>
            <button
              type="button"
              className="btn glass"
              style={{ width: '100%', justifyContent: 'flex-start', border: '1px solid rgba(255,255,255,0.1)' }}
              onClick={() => startTrip('evening')}
            >
              <Moon size={18} color="#93c5fd" style={{ marginRight: 10 }} /> Evening (campus → stops)
            </button>
            <button type="button" className="btn" style={{ background: 'transparent', color: 'var(--text-muted)' }} onClick={() => setShowTripDialog(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {tripActive && busInfo && (
        <div className="glass-card animate-fade-in" style={{ marginTop: 8 }}>
          <h3 style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800 }}>
            <AlertCircle size={18} color="var(--status-delayed)" /> Live trip controls
          </h3>

          <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600 }}>
            Manual stop (if GPS weak)
          </label>
          <select
            className="input-glass"
            style={{ padding: 12, width: '100%', marginBottom: 16 }}
            value={busInfo.current_stop || ''}
            onChange={(e) => onStopManualChange(e.target.value)}
          >
            <option value="" disabled>
              Select current stop
            </option>
            {orderedStops.map((stop) => (
              <option key={stop} value={stop} style={{ color: '#0f172a' }}>
                {stop}
              </option>
            ))}
          </select>

          <button
            type="button"
            className="btn btn-delay"
            style={{ width: '100%', marginBottom: 10 }}
            onClick={() => updateBusLocation(driver.assigned_bus_id, { status: 'Delayed' })}
          >
            <AlertCircle size={18} style={{ marginRight: 8 }} /> Report delay
          </button>
          <button
            type="button"
            className="btn"
            style={{
              width: '100%',
              marginBottom: 10,
              background: 'rgba(34, 197, 94, 0.18)',
              color: 'var(--status-ontime)',
              border: '1px solid var(--status-ontime)',
            }}
            onClick={() => updateBusLocation(driver.assigned_bus_id, { status: 'On Time' })}
          >
            <Play size={18} style={{ marginRight: 8 }} /> Mark on time
          </button>
          <button
            type="button"
            className="btn btn-alert"
            style={{ width: '100%' }}
            onClick={() => updateBusLocation(driver.assigned_bus_id, { status: 'Emergency' })}
          >
            <ShieldAlert size={18} style={{ marginRight: 8 }} /> Report emergency
          </button>

          <div
            style={{
              marginTop: 20,
              padding: 16,
              background: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.35)',
              borderRadius: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div className="glow-pulse" />
            <span style={{ fontSize: '0.88rem', color: 'var(--status-ontime)', fontWeight: 600 }}>
              Location uplink ~every 18s while trip is active (GPS, then network fallback).
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
