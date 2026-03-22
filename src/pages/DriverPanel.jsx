import React, { useState, useEffect } from 'react';
import { subscribeToDB, startDriverTracking, stopDriverTracking, updateBusLocation } from '../lib/store';
import { supabase } from '../lib/supabase';
import { Play, Square, MapPin, Navigation, Bus, AlertCircle, Sun, Moon } from 'lucide-react';

export default function DriverPanel() {
  const [db, setDb] = useState({ buses: [], routes: [], drivers: [] });
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showTripDialog, setShowTripDialog] = useState(false);

  useEffect(() => {
    const initPanel = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if(session?.user) {
         const { data: currentDriver } = await supabase.from('drivers').select('*').eq('user_id', session.user.id).single();
         setDriver(currentDriver);
      }
      setLoading(false);
    };
    initPanel();

    const unsubscribe = subscribeToDB((data) => setDb(data));
    return unsubscribe;
  }, []);

  if (loading) return <div style={{ padding: '20px', color: 'white' }}>Loading Panel...</div>;
  if (!driver) return <div style={{ padding: '20px', color: 'white' }}>Unauthorized / Not a driver.</div>;

  const busInfo = db.buses.find(b => b.bus_id === driver.assigned_bus_id);
  const tripActive = busInfo?.trip_active || false;

  const startTrip = (trip_type) => {
    setShowTripDialog(false);
    if(busInfo) {
      startDriverTracking(driver.assigned_bus_id, trip_type);
    }
  };

  const endTrip = () => {
    stopDriverTracking(driver.assigned_bus_id);
  };

  return (
    <div className="scroll-area animate-fade-in" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h1 className="title-gradient" style={{ fontSize: '1.8rem' }}>Driver Panel</h1>
          <p style={{ color: 'var(--text-muted)' }}>Welcome back, {driver.name}</p>
        </div>
        <div className="glass" style={{ padding: '10px', borderRadius: '50%' }}>
          <Bus size={24} color="var(--status-ontime)" />
        </div>
      </div>

      {!busInfo ? (
         <div className="glass-card"><p>No Bus assigned.</p></div>
      ) : (
        <div className="glass-card" style={{ marginBottom: '20px', position: 'relative', overflow: 'hidden' }}>
          {tripActive && (
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '4px', background: 'var(--grad-map)', animation: 'pulse 2s infinite' }} />
          )}
          <h2 style={{ fontSize: '1.4rem', marginBottom: '5px' }}>Route {busInfo.assigned_route_id || 'Unknown'}</h2>
          <span style={{ fontSize: '0.8rem', padding: '4px 8px', background: 'rgba(255,255,255,0.1)', borderRadius: '15px' }}>
            Bus #{driver.assigned_bus_id} • {busInfo.trip_type && busInfo.trip_active ? (busInfo.trip_type === 'morning' ? '🌅 Morning Trip' : '🌆 Evening Trip') : 'Idle'}
          </span>
          
          <div style={{ display: 'flex', gap: '15px', margin: '20px 0' }}>
            <div className="glass" style={{ flex: 1, padding: '15px', borderRadius: '12px', textAlign: 'center' }}>
              <MapPin size={24} color="var(--text-muted)" style={{ margin: '0 auto 10px' }} />
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Current Stop</div>
              <strong>{busInfo.current_stop || 'GPS Syncing...'}</strong>
            </div>

            <div className="glass" style={{ flex: 1, padding: '15px', borderRadius: '12px', textAlign: 'center' }}>
              <Navigation size={24} color="var(--text-muted)" style={{ margin: '0 auto 10px' }} />
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Status</div>
              <strong style={{ color: busInfo.status === 'Delayed' ? 'var(--status-delayed)' : 'var(--status-ontime)' }}>
                {busInfo.status || 'Offline'}
              </strong>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            {!tripActive ? (
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setShowTripDialog(true)}>
                <Play size={18} style={{ marginRight: '8px' }} /> Start Trip
              </button>
            ) : (
              <button className="btn btn-alert" style={{ flex: 1 }} onClick={endTrip}>
                <Square size={18} style={{ marginRight: '8px' }} /> End Trip
              </button>
            )}
          </div>
        </div>
      )}

      {showTripDialog && (
        <div className="glass-card animate-fade-in" style={{ marginBottom: '20px', border: '1px solid var(--grad-primary)' }}>
          <h3 style={{ marginBottom: '15px' }}>Select Trip Type</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button className="btn glass" style={{ width: '100%', justifyContent: 'flex-start', border: '1px solid rgba(255,255,255,0.1)' }} onClick={() => startTrip('morning')}>
              <Sun size={18} color="#f59e0b" style={{ marginRight: '10px' }} /> Morning (Points → Campus)
            </button>
            <button className="btn glass" style={{ width: '100%', justifyContent: 'flex-start', border: '1px solid rgba(255,255,255,0.1)' }} onClick={() => startTrip('evening')}>
              <Moon size={18} color="#60a5fa" style={{ marginRight: '10px' }} /> Evening (Campus → Points)
            </button>
            <button className="btn" style={{ background: 'transparent', color: 'var(--text-muted)' }} onClick={() => setShowTripDialog(false)}>Cancel</button>
          </div>
        </div>
      )}

      {tripActive && (
        <div className="glass-card animate-fade-in" style={{ marginTop: '20px' }}>
          <h3 style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={18} color="var(--status-delayed)" /> Trip Controls
          </h3>

          <button className="btn btn-alert" style={{ width: '100%' }} onClick={() => updateBusLocation(driver.assigned_bus_id, { status: 'Delayed' })}>
            <AlertCircle size={18} style={{ marginRight: '8px' }} /> Report Delay
          </button>
          <button className="btn" style={{ width: '100%', marginTop: '10px', background: 'rgba(34, 197, 94, 0.2)', color: 'var(--status-ontime)', border: '1px solid var(--status-ontime)' }} onClick={() => updateBusLocation(driver.assigned_bus_id, { status: 'On Time' })}>
             <Play size={18} style={{ marginRight: '8px' }} /> Mark On-Time
          </button>
          
          <div style={{ animation: 'pulse 2s infinite', marginTop: '20px', padding: '15px', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="glow-ontime" />
            <span style={{ fontSize: '0.9rem', color: 'var(--status-ontime)' }}>Real GPS tracking active</span>
          </div>
        </div>
      )}
    </div>
  );
}
