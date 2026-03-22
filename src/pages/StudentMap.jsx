import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import { subscribeToDB, getOrderedStops } from '../lib/store';
import { Clock, MapPin, Route, BusFront, ArrowLeft, ArrowRight, Sun, Moon, AlertTriangle, Loader, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

const createGlowIcon = (status) => {
  const isDelayed = status === 'Delayed';
  const html = `<div class="custom-bus-marker ${isDelayed ? 'delayed' : ''}" style="width: 24px; height: 24px;">
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-bus"><path d="M8 6v6"/><path d="M15 6v6"/><path d="M2.5 13h19"/><path d="M20.5 16h-17"/><rect x="4" y="3" width="16" height="16" rx="2"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>
  </div>`;
  
  return L.divIcon({
    html,
    className: 'bus-marker-icon',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12]
  });
};

export default function StudentMap() {
  const [db, setDb] = useState({ buses: [], routes: [] });
  const [selectedBus, setSelectedBus] = useState(null);
  const [view, setView] = useState('list');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  useEffect(() => {
    const unsubscribe = subscribeToDB((newDb) => {
      setDb(newDb);
      setLoading(false);
      if (selectedBus) {
        const updated = newDb.buses.find(b => b.bus_id === selectedBus.bus_id);
        if (updated) setSelectedBus(updated);
      }
    });
    return unsubscribe;
  }, [selectedBus]);

  const handleBusClick = (bus) => {
    setSelectedBus(bus);
    setView('map');
  };

  const getRouteInfo = (route_id) => {
    return db.routes.find(r => r.route_id === route_id) || { stops: [] };
  };

  const currentHour = new Date().getHours();
  // Service window check
  const isServiceWindow = (currentHour >= 6 && currentHour <= 9) || (currentHour >= 16 && currentHour <= 19);

  if (loading) {
    return (
      <div style={{ padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '20px' }}>
        <Loader size={48} color="var(--status-ontime)" className="animate-spin" style={{ animation: 'spin 1.5s linear infinite' }} />
        <h2 className="title-gradient">Connecting to Supabase Network...</h2>
        <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', width: '100%', position: 'relative' }}>
      <AnimatePresence>
        {view === 'list' && (
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="scroll-area"
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'var(--bg-dark)', zIndex: 10 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h1 className="title-gradient" style={{ fontSize: '2.5rem', margin: 0 }}>Campus Live</h1>
              <button 
                className="btn glass" 
                style={{ padding: '8px 15px', color: 'var(--text-light)', border: '1px solid rgba(255,255,255,0.1)' }} 
                onClick={handleLogout}
              >
                <LogOut size={18} style={{ marginRight: '5px' }} /> Logout
              </button>
            </div>
            
            {db.buses.length === 0 && (
               <div className="glass-card" style={{ textAlign: 'center', padding: '30px', border: '1px solid var(--status-delayed)', background: 'rgba(245, 158, 11, 0.1)' }}>
                  <AlertTriangle size={36} color="var(--status-delayed)" style={{ margin: '0 auto 10px' }} />
                  <h3 style={{ fontSize: '1.4rem' }}>No Trips Configured</h3>
                  <p style={{ color: 'var(--text-muted)' }}>
                    The database is empty. No buses are actively configured yet.
                  </p>
               </div>
            )}

            <div style={{ display: 'grid', gap: '15px' }}>
              {db.buses.map(bus => {
                const routeInfo = getRouteInfo(bus.assigned_route_id);
                const orderedStops = getOrderedStops(routeInfo, bus.trip_type);

                const currentStopIndex = orderedStops.indexOf(bus.current_stop);
                const nextStop = currentStopIndex !== -1 && currentStopIndex + 1 < orderedStops.length ? orderedStops[currentStopIndex + 1] : bus.next_stops?.[0] || 'Terminus';
                const eta = bus.estimated_times?.[0] || 'N/A';

                return (
                  <motion.div 
                    key={bus.bus_id} 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="glass-card" 
                    style={{ border: bus.trip_type === 'morning' ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(96, 165, 250, 0.3)', display: 'flex', flexDirection: 'column', gap: '15px', cursor: 'pointer', padding: '20px' }}
                    onClick={() => handleBusClick(bus)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{ background: bus.status === 'Delayed' ? 'var(--grad-alert)' : 'var(--grad-map)', padding: '12px', borderRadius: '12px' }}>
                          <BusFront size={24} color="white" />
                        </div>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Bus #{bus.bus_id} • {routeInfo.route_name || `Route ${bus.assigned_route_id}`}</h3>
                          <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
                             {bus.trip_type === 'morning' ? (
                                <span style={{ fontSize: '0.75rem', padding: '4px 8px', background: 'rgba(245,158,11,0.2)', color: '#fcd34d', borderRadius: '8px', display: 'flex', alignItems: 'center' }}>
                                   🌅 Morning - Pickup → Campus
                                </span>
                             ) : (
                                <span style={{ fontSize: '0.75rem', padding: '4px 8px', background: 'rgba(96,165,250,0.2)', color: '#93c5fd', borderRadius: '8px', display: 'flex', alignItems: 'center' }}>
                                   🌆 Evening - Campus → Pickup
                                </span>
                             )}
                          </div>
                      </div>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(255,255,255,0.05)', padding: '5px 10px', borderRadius: '20px' }}>
                        {bus.trip_active ? (
                          <>
                            <div className={bus.status === 'Delayed' ? 'glow-delayed' : 'glow-ontime'} />
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: bus.status === 'Delayed' ? 'var(--status-delayed)' : 'var(--status-ontime)' }}>
                              {bus.status || 'Active'}
                            </span>
                          </>
                        ) : (
                          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Waiting / Not Started</span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '12px' }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Current Stop</div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{bus.current_stop || 'Updating...'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Next Stop</div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'white' }}>{nextStop}</div>
                      </div>
                      <div style={{ gridColumn: 'span 2' }}>
                         <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ETA</div>
                         <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--grad-map)' }}>{eta}</div>
                      </div>
                    </div>

                    <button className="btn btn-primary" style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                      Track Live <ArrowRight size={16} />
                    </button>
                  </motion.div>
                );
              })}
            </div>

            <div style={{ marginTop: '40px', marginBottom: '20px' }}>
              <h2 className="title-gradient" style={{ fontSize: '1.8rem' }}>Drivers Roster</h2>
            </div>
            <div style={{ display: 'grid', gap: '15px', paddingBottom: '40px' }}>
              {(db.drivers || []).map(driver => {
                 const assignedRoute = db.buses.find(b => b.bus_id === driver.assigned_bus_id)?.assigned_route_id;
                 const routeInfo = getRouteInfo(assignedRoute);
                 return (
                   <div key={driver.driver_id} className="glass-card" style={{ padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                     <div>
                       <h4 style={{ margin: 0, fontSize: '1.1rem' }}>{driver.name}</h4>
                       <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                         Bus #{driver.assigned_bus_id || 'Unassigned'} • {routeInfo.route_name || `Route ${assignedRoute || 'TBD'}`}
                       </p>
                     </div>
                   </div>
                 );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {view === 'map' && (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 20 }}
          >
            <div className="glass" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '15px 20px', zIndex: 1000, position: 'absolute', top: '10px', left: '10px', right: '10px', borderRadius: '15px' }}>
              <ArrowLeft size={24} color="white" style={{ cursor: 'pointer' }} onClick={() => setView('list')} />
              <div>
                <h2 className="title-gradient" style={{ margin: 0, fontSize: '1.2rem' }}>Live Tracking</h2>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Route {selectedBus?.assigned_route_id}</p>
              </div>
            </div>

            <MapContainer 
              center={selectedBus ? [selectedBus.current_lat || 28.6139, selectedBus.current_lng || 77.2090] : [28.6139, 77.2090]} 
              zoom={14} 
              style={{ height: '100%', width: '100%', zIndex: 1 }}
              zoomControl={false}
            >
              <TileLayer attribution='&copy; CARTO' url='https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' />
              
              {db.buses.map(bus => {
                if(!bus.trip_active || !bus.current_lat || !bus.current_lng) return null;
                const isSelected = selectedBus?.bus_id === bus.bus_id;
                if(!isSelected && selectedBus) return null; 

                return (
                  <Marker 
                    key={bus.bus_id} 
                    position={[bus.current_lat, bus.current_lng]}
                    icon={createGlowIcon(bus.status)}
                  >
                  </Marker>
                );
              })}
            </MapContainer>

            {/* Bottom Sheet */}
            {selectedBus && (
              <motion.div 
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                className="glass-card"
                style={{ 
                  position: 'absolute', 
                  bottom: '20px', 
                  left: '10px', 
                  right: '10px', 
                  zIndex: 1000, 
                  padding: '20px',
                  border: `1px solid ${selectedBus.status === 'Delayed' ? 'var(--status-delayed)' : 'rgba(255,255,255,0.1)'}`,
                  maxHeight: '60vh',
                  overflowY: 'auto'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ background: selectedBus.status === 'Delayed' ? 'var(--grad-alert)' : 'var(--grad-map)', padding: '10px', borderRadius: '12px' }}>
                      <BusFront size={24} color="white" />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Route {selectedBus.assigned_route_id}</h3>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Bus {selectedBus.bus_id}</p>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(0,0,0,0.3)', padding: '6px 12px', borderRadius: '20px' }}>
                    {selectedBus.trip_active ? (
                      <>
                        <div className={selectedBus.status === 'Delayed' ? 'glow-delayed' : 'glow-ontime'} />
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: selectedBus.status === 'Delayed' ? 'var(--status-delayed)' : 'var(--status-ontime)' }}>
                          {selectedBus.status || 'Active'}
                        </span>
                      </>
                    ) : (
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Not Started</span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                  <div className="glass" style={{ padding: '12px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-muted)' }}>
                      <MapPin size={14} /> <span style={{ fontSize: '0.75rem' }}>Current Stop</span>
                    </div>
                    <strong style={{ fontSize: '0.9rem' }}>{selectedBus.current_stop || 'Syncing...'}</strong>
                  </div>
                  
                  <div className="glass" style={{ padding: '12px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-muted)' }}>
                      <Clock size={14} /> <span style={{ fontSize: '0.75rem' }}>ETA to Next</span>
                    </div>
                    <strong style={{ fontSize: '0.9rem' }}>{selectedBus.estimated_times?.[0] || 'N/A'}</strong>
                  </div>
                </div>

                {/* Timeline */}
                <h4 style={{ fontSize: '1rem', marginBottom: '15px', color: 'rgba(255,255,255,0.8)' }}>
                  Route Progress ({selectedBus.trip_type === 'morning' ? 'Sunrise' : 'Evening'})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0', position: 'relative' }}>
                  {(() => {
                    const routeInfo = getRouteInfo(selectedBus.assigned_route_id);
                    const orderedStops = getOrderedStops(routeInfo, selectedBus.trip_type);

                    const currentStopIndex = orderedStops.indexOf(selectedBus.current_stop);
                    
                    return orderedStops.map((stop, index) => {
                      const isCompleted = currentStopIndex !== -1 && index < currentStopIndex;
                      const isCurrent = currentStopIndex !== -1 && index === currentStopIndex;
                      const isUpcoming = currentStopIndex === -1 || index > currentStopIndex;

                      return (
                        <div key={stop + index} style={{ display: 'flex', alignItems: 'flex-start', gap: '15px', position: 'relative', height: '50px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
                            {index > 0 && (
                              <div style={{ position: 'absolute', top: '-30px', left: '7px', width: '2px', height: '38px', background: isCompleted || isCurrent ? 'var(--status-ontime)' : 'rgba(255,255,255,0.2)' }} />
                            )}
                            <div style={{ 
                                width: '16px', height: '16px', borderRadius: '50%', zIndex: 2, 
                                background: isCompleted ? 'var(--status-ontime)' : (isCurrent ? 'var(--grad-alert)' : 'rgba(255,255,255,0.2)'),
                                border: isCurrent ? '2px solid white' : 'none',
                                animation: isCurrent ? 'pulse 2s infinite' : 'none',
                                boxShadow: isCurrent ? '0 0 10px rgba(234, 88, 12, 0.8)' : 'none'
                            }} />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', marginTop: '-2px', flex: 1 }}>
                            <span style={{ 
                              fontSize: isCurrent ? '1rem' : '0.9rem', 
                              fontWeight: isCurrent ? 700 : 400,
                              color: isCompleted ? 'var(--text-muted)' : 'white',
                              textDecoration: isCompleted ? 'line-through' : 'none'
                             }}>
                              {stop}
                            </span>
                            {isUpcoming && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Est. {(index - currentStopIndex) * 15} mins</span>}
                            {isCurrent && <span style={{ fontSize: '0.75rem', color: 'var(--status-ontime)' }}>Bus is here</span>}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
