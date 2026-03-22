import React, { useState, useEffect } from 'react';
import { subscribeToDB, emergencyReassignRoute } from '../lib/store';
import { ShieldAlert, RefreshCw, BusFront, Settings, Edit2, Trash2, Plus, Clock, MapPin, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const [db, setDb] = useState({ buses: [], routes: [], drivers: [] });
  const [activeTab, setActiveTab] = useState('monitor');
  const navigate = useNavigate();
  
  // Emergency Reassignment Form State
  const [oldBus, setOldBus] = useState('');
  const [newBus, setNewBus] = useState('');
  const [route, setRoute] = useState('');

  useEffect(() => {
    return subscribeToDB(setDb);
  }, []);

  const handleReassign = (e) => {
    e.preventDefault();
    if (oldBus && newBus && route) {
      emergencyReassignRoute(oldBus, newBus, route);
      alert('Emergency assignment updated. Students track the correct path instantly.');
      setOldBus('');
      setNewBus('');
      setRoute('');
    }
  };

  const dbDrivers = db.drivers || []; 

  return (
    <div className="scroll-area animate-fade-in" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 className="title-gradient" style={{ fontSize: '1.8rem' }}>Admin Dashboard</h1>
          <p style={{ color: 'var(--text-muted)' }}>Overhead view</p>
        </div>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <div className="glass" style={{ padding: '10px', borderRadius: '50%' }}>
            <Settings size={24} color="var(--status-ontime)" />
          </div>
          <button 
            className="btn glass" 
            style={{ padding: '8px 15px', color: 'var(--text-light)', border: '1px solid rgba(255,255,255,0.1)' }} 
            onClick={async () => { await supabase.auth.signOut(); navigate('/login'); }}
          >
            <LogOut size={18} style={{ marginRight: '5px' }} /> Logout
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="glass" style={{ display: 'flex', borderRadius: '12px', marginBottom: '20px', padding: '5px', overflowX: 'auto', whiteSpace: 'nowrap' }}>
        <button 
          className={`btn ${activeTab === 'monitor' ? 'btn-primary' : ''}`}
          style={{ padding: '10px 15px', background: activeTab === 'monitor' ? '' : 'transparent', flexShrink: 0 }} 
          onClick={() => setActiveTab('monitor')}
        >
          Monitor
        </button>
        <button 
          className={`btn ${activeTab === 'emergency' ? 'btn-alert' : ''}`}
          style={{ padding: '10px 15px', background: activeTab === 'emergency' ? '' : 'transparent', flexShrink: 0 }} 
          onClick={() => setActiveTab('emergency')}
        >
          Emergencies
        </button>
        <button 
          className={`btn ${activeTab === 'buses' ? 'btn-primary' : ''}`}
          style={{ padding: '10px 15px', background: activeTab === 'buses' ? '' : 'transparent', flexShrink: 0 }} 
          onClick={() => setActiveTab('buses')}
        >
          Buses
        </button>
        <button 
          className={`btn ${activeTab === 'routes' ? 'btn-primary' : ''}`}
          style={{ padding: '10px 15px', background: activeTab === 'routes' ? '' : 'transparent', flexShrink: 0 }} 
          onClick={() => setActiveTab('routes')}
        >
          Routes
        </button>
        <button 
          className={`btn ${activeTab === 'drivers' ? 'btn-primary' : ''}`}
          style={{ padding: '10px 15px', background: activeTab === 'drivers' ? '' : 'transparent', flexShrink: 0 }} 
          onClick={() => setActiveTab('drivers')}
        >
          Drivers
        </button>
      </div>

      {activeTab === 'monitor' && (
        <div className="animate-fade-in">
          <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
            <div className="glass-card" style={{ flex: 1, padding: '15px', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--status-ontime)' }}>
                {db.buses.filter(b => b.status === 'On Time').length}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>On-Time</div>
            </div>
            <div className="glass-card" style={{ flex: 1, padding: '15px', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--status-delayed)' }}>
                {db.buses.filter(b => b.status === 'Delayed').length}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Delayed</div>
            </div>
          </div>

          <h3 style={{ marginBottom: '15px', fontSize: '1.2rem' }}>Live Fleet Status</h3>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' }}>
            {db.buses.slice(0, 10).map(b => (
              <div key={b.bus_id} className="glass" style={{ padding: '15px', borderRadius: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <BusFront size={16} />
                    <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>Bus {b.bus_id}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div className={b.status === 'Delayed' ? 'glow-delayed' : 'glow-ontime'} />
                    <span style={{ fontSize: '0.75rem', color: b.status === 'Delayed' ? 'var(--status-delayed)' : 'var(--status-ontime)' }}>
                      {b.status}
                    </span>
                  </div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: 'var(--grad-map)', fontWeight: 600 }}>Route:</span> {b.assigned_route_id || 'Unassigned'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
                    <MapPin size={14} /> {b.current_stop || 'N/A'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
                    <Clock size={14} /> Updated {Math.floor((Date.now() - b.last_updated) / 1000)}s ago
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p style={{ textAlign: 'center', margin: '20px 0', color: 'var(--text-muted)' }}>
            + {db.buses.length > 10 ? db.buses.length - 10 : 0} more buses running
          </p>
        </div>
      )}

      {activeTab === 'buses' && (
        <div className="animate-fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ fontSize: '1.2rem' }}>All Buses</h3>
            <button className="btn btn-primary" onClick={() => alert('Add Bus dialog')}><Plus size={16}/> Add Bus</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {db.buses.map(b => (
              <div key={b.bus_id} className="glass" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', borderRadius: '12px' }}>
                <div>
                  <h4 style={{ margin: 0 }}>Bus {b.bus_id}</h4>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Assigned to: {b.assigned_route_id || 'None'}</div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="btn" style={{ padding: '8px', background: 'rgba(255,255,255,0.1)' }} onClick={() => alert('Edit Bus')}><Edit2 size={14}/></button>
                  <button className="btn btn-alert" style={{ padding: '8px' }} onClick={() => alert('Delete Bus')}><Trash2 size={14}/></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'routes' && (
        <div className="animate-fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ fontSize: '1.2rem' }}>All Routes</h3>
            <button className="btn btn-primary" onClick={() => alert('Add Route dialog')}><Plus size={16}/> Add Route</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {db.routes.map(r => (
              <div key={r.route_id} className="glass" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', borderRadius: '12px' }}>
                <div>
                  <h4 style={{ margin: 0 }}>{r.route_name} ({r.route_id})</h4>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '5px' }}>
                    {r.stops.length} stops: {r.stops.join(' → ')}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="btn" style={{ padding: '8px', background: 'rgba(255,255,255,0.1)' }} onClick={() => alert('Edit Route')}><Edit2 size={14}/></button>
                  <button className="btn btn-alert" style={{ padding: '8px' }} onClick={() => alert('Delete Route')}><Trash2 size={14}/></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'drivers' && (
        <div className="animate-fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ fontSize: '1.2rem' }}>All Drivers</h3>
            <button className="btn btn-primary" onClick={() => alert('Add Driver dialog')}><Plus size={16}/> Add Driver</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {dbDrivers.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No drivers found.</p>}
            {dbDrivers.map(d => (
              <div key={d.driver_id} className="glass" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', borderRadius: '12px' }}>
                <div>
                  <h4 style={{ margin: 0 }}>{d.name}</h4>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Driver ID: {d.driver_id} | Bus: {d.assigned_bus_id || 'None'}</div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="btn" style={{ padding: '8px', background: 'rgba(255,255,255,0.1)' }} onClick={() => alert('Edit Driver')}><Edit2 size={14}/></button>
                  <button className="btn btn-alert" style={{ padding: '8px' }} onClick={() => alert('Delete Driver')}><Trash2 size={14}/></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'emergency' && (
        <div className="glass-card animate-fade-in">
          <h2 className="title-alert" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
            <ShieldAlert size={24} /> Route Reassignment
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
            Instantly swap a broken down bus with a replacement. Students tracking the route will experience no disruption.
          </p>

          <form onSubmit={handleReassign}>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>Route Need Fixing</label>
              <input 
                type="text" 
                className="input-glass" 
                placeholder="e.g. R34" 
                value={route} 
                onChange={e => setRoute(e.target.value)} 
                required 
              />
            </div>
            
            <div style={{ display: 'flex', gap: '15px' }}>
              <div style={{ flex: 1, marginBottom: '15px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>Broken App Bus #</label>
                <input 
                  type="text" 
                  className="input-glass" 
                  placeholder="e.g. B12" 
                  value={oldBus} 
                  onChange={e => setOldBus(e.target.value)} 
                  required 
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: '10px' }}>
                <RefreshCw size={18} color="rgba(255,255,255,0.4)" />
              </div>

              <div style={{ flex: 1, marginBottom: '15px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>Replacement Bus #</label>
                <input 
                  type="text" 
                  className="input-glass" 
                  placeholder="e.g. B45" 
                  value={newBus} 
                  onChange={e => setNewBus(e.target.value)} 
                  required 
                />
              </div>
            </div>

            <button type="submit" className="btn btn-alert" style={{ width: '100%', marginTop: '10px' }}>
              Execute Emergency Swap
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
