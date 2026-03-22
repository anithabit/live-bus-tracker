import React, { useState, useEffect } from 'react';
import {
  subscribeToDB,
  emergencyReassignRoute,
  getStopLabels,
  secondsSinceUpdate,
} from '../lib/store';
import {
  ShieldAlert,
  BusFront,
  Settings,
  Edit2,
  Trash2,
  Plus,
  Clock,
  MapPin,
  LogOut,
  X,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { motion as Motion, AnimatePresence } from 'framer-motion';

function parseStopsInput(text) {
  const t = text.trim();
  if (!t) return [];
  try {
    const p = JSON.parse(t);
    if (Array.isArray(p)) return p;
    return [];
  } catch {
    return t.split(/\||\n|,/).map((s) => s.trim()).filter(Boolean);
  }
}

export default function AdminDashboard() {
  const [db, setDb] = useState({ buses: [], routes: [], drivers: [] });
  const [activeTab, setActiveTab] = useState('monitor');
  const navigate = useNavigate();

  const [oldBus, setOldBus] = useState('');
  const [newBus, setNewBus] = useState('');
  const [routeId, setRouteId] = useState('');

  const [busModal, setBusModal] = useState(null);
  const [routeModal, setRouteModal] = useState(null);
  const [driverModal, setDriverModal] = useState(null);

  useEffect(() => {
    return subscribeToDB(setDb);
  }, []);

  const refresh = async () => {
    const { data: buses } = await supabase.from('buses').select('*');
    const { data: routes } = await supabase.from('routes').select('*');
    const { data: drivers } = await supabase.from('drivers').select('*');
    setDb({
      buses: buses || [],
      routes: routes || [],
      drivers: drivers || [],
    });
  };

  const handleReassign = async (e) => {
    e.preventDefault();
    if (!oldBus || !newBus || !routeId) return;
    await emergencyReassignRoute(oldBus, newBus, routeId);
    alert('Route assignment updated. Students following this route_id see the replacement bus.');
    setOldBus('');
    setNewBus('');
    setRouteId('');
    refresh();
  };

  const openNewBus = () =>
    setBusModal({
      _edit: false,
      bus_id: '',
      assigned_route_id: '',
      status: 'On Time',
      trip_active: false,
      current_stop: '',
      current_lat: '',
      current_lng: '',
    });

  const saveBus = async () => {
    if (!busModal?.bus_id) {
      alert('Bus ID is required.');
      return;
    }
    const lat =
      busModal.current_lat === '' ? null : Number(busModal.current_lat);
    const lng =
      busModal.current_lng === '' ? null : Number(busModal.current_lng);
    const row = {
      bus_id: busModal.bus_id,
      assigned_route_id: busModal.assigned_route_id || null,
      status: busModal.status || 'On Time',
      trip_active: !!busModal.trip_active,
      current_stop: busModal.current_stop || null,
      current_lat: Number.isFinite(lat) ? lat : null,
      current_lng: Number.isFinite(lng) ? lng : null,
      last_updated: new Date().toISOString(),
    };
    const exists = db.buses.some((b) => String(b.bus_id) === String(busModal.bus_id));
    const q = exists
      ? supabase.from('buses').update(row).eq('bus_id', busModal.bus_id)
      : supabase.from('buses').insert(row);
    const { error } = await q;
    if (error) {
      alert(error.message);
      return;
    }
    setBusModal(null);
    refresh();
  };

  const deleteBus = async (id) => {
    if (!confirm(`Delete bus ${id}?`)) return;
    const { error } = await supabase.from('buses').delete().eq('bus_id', id);
    if (error) alert(error.message);
    else refresh();
  };

  const openNewRoute = () =>
    setRouteModal({
      _edit: false,
      route_id: '',
      route_name: '',
      stops_text: '["Stop A", "Campus"]',
    });

  const openEditRoute = (r) =>
    setRouteModal({
      _edit: true,
      route_id: r.route_id,
      route_name: r.route_name || '',
      stops_text: JSON.stringify(getStopLabels(r.stops).length ? getStopLabels(r.stops) : r.stops || [], null, 2),
    });

  const saveRoute = async () => {
    if (!routeModal?.route_id || !routeModal.route_name) {
      alert('Route ID and name are required.');
      return;
    }
    const stops = parseStopsInput(routeModal.stops_text);
    const row = {
      route_id: routeModal.route_id,
      route_name: routeModal.route_name,
      stops,
    };
    const exists = db.routes.some((r) => String(r.route_id) === String(routeModal.route_id));
    const q = exists
      ? supabase.from('routes').update(row).eq('route_id', routeModal.route_id)
      : supabase.from('routes').insert(row);
    const { error } = await q;
    if (error) {
      alert(error.message);
      return;
    }
    setRouteModal(null);
    refresh();
  };

  const deleteRoute = async (id) => {
    if (!confirm(`Delete route ${id}?`)) return;
    const { error } = await supabase.from('routes').delete().eq('route_id', id);
    if (error) alert(error.message);
    else refresh();
  };

  const openNewDriver = () =>
    setDriverModal({
      _edit: false,
      driver_id: '',
      name: '',
      phone_number: '',
      email: '',
      login_email: '',
      assigned_bus_id: '',
      user_id: '',
    });

  const openEditDriver = (d) =>
    setDriverModal({
      _edit: true,
      driver_id: d.driver_id,
      name: d.name || '',
      phone_number: d.phone_number || d.phone || '',
      email: d.email || '',
      login_email: d.login_email || d.auth_email || d.email || '',
      assigned_bus_id: d.assigned_bus_id ?? '',
      user_id: d.user_id || '',
    });

  const saveDriver = async () => {
    if (!driverModal?.driver_id || !driverModal.name) {
      alert('Driver ID and name are required.');
      return;
    }
    const row = {
      driver_id: driverModal.driver_id,
      name: driverModal.name,
      phone_number: driverModal.phone_number || null,
      email: (driverModal.login_email || driverModal.email || '').trim() || null,
      assigned_bus_id: driverModal.assigned_bus_id === '' ? null : driverModal.assigned_bus_id,
      user_id: driverModal.user_id || null,
    };

    const exists = db.drivers.some((d) => String(d.driver_id) === String(driverModal.driver_id));
    const q = exists
      ? supabase.from('drivers').update(row).eq('driver_id', driverModal.driver_id)
      : supabase.from('drivers').insert(row);
    const { error } = await q;
    if (error) {
      alert(error.message);
      return;
    }
    setDriverModal(null);
    refresh();
  };

  const deleteDriver = async (id) => {
    if (!confirm(`Delete driver ${id}?`)) return;
    const { error } = await supabase.from('drivers').delete().eq('driver_id', id);
    if (error) alert(error.message);
    else refresh();
  };

  const dbDrivers = db.drivers || [];

  return (
    <div className="scroll-area animate-fade-in app-gradient-bg" style={{ minHeight: '100vh', paddingBottom: 100 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 className="title-gradient" style={{ fontSize: '1.85rem', fontWeight: 800 }}>
            Admin command center
          </h1>
          <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Fleet, routes, and emergencies</p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div className="glass" style={{ padding: 10, borderRadius: '50%' }}>
            <Settings size={24} color="#86efac" />
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

      <div className="glass" style={{ display: 'flex', borderRadius: 14, marginBottom: 20, padding: 6, overflowX: 'auto', gap: 6 }}>
        {[
          ['monitor', 'Live monitor'],
          ['emergency', 'Emergency'],
          ['buses', 'Buses'],
          ['routes', 'Routes'],
          ['drivers', 'Drivers'],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`btn ${activeTab === id ? (id === 'emergency' ? 'btn-alert' : 'btn-primary') : ''}`}
            style={{
              padding: '10px 14px',
              background: activeTab === id ? undefined : 'transparent',
              flexShrink: 0,
              fontSize: '0.85rem',
            }}
            onClick={() => setActiveTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'monitor' && (
        <div className="animate-fade-in">
          <div style={{ display: 'flex', gap: 14, marginBottom: 20 }}>
            <div className="glass-card" style={{ flex: 1, padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--status-ontime)' }}>
                {db.buses.filter((b) => b.status === 'On Time').length}
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>On time</div>
            </div>
            <div className="glass-card" style={{ flex: 1, padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--status-delayed)' }}>
                {db.buses.filter((b) => b.status === 'Delayed').length}
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>Delayed</div>
            </div>
            <div className="glass-card" style={{ flex: 1, padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--status-emergency)' }}>
                {db.buses.filter((b) => b.status === 'Emergency').length}
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>Emergency</div>
            </div>
          </div>

          <h3 style={{ marginBottom: 14, fontSize: '1.15rem', fontWeight: 800 }}>All buses ({db.buses.length})</h3>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
            {db.buses.map((b) => {
              const sec = secondsSinceUpdate(b.last_updated);
              return (
                <div key={b.bus_id} className="glass-card" style={{ padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <BusFront size={18} />
                      <span style={{ fontWeight: 800, fontSize: '1.05rem' }}>Bus {b.bus_id}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div
                        className={
                          b.status === 'Emergency'
                            ? 'glow-emergency'
                            : b.status === 'Delayed'
                              ? 'glow-delayed'
                              : 'glow-ontime'
                        }
                      />
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          color:
                            b.status === 'Emergency'
                              ? 'var(--status-emergency)'
                              : b.status === 'Delayed'
                                ? 'var(--status-delayed)'
                                : 'var(--status-ontime)',
                        }}
                      >
                        {b.status || '—'}
                      </span>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.84rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div>
                      <span style={{ color: '#67e8f9', fontWeight: 700 }}>Route</span> {b.assigned_route_id ?? '—'}
                    </div>
                    <div style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <MapPin size={14} /> {b.current_stop || '—'}
                    </div>
                    <div style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Clock size={14} /> {sec != null ? `${sec}s ago` : '—'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'buses' && (
        <div className="animate-fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Buses</h3>
            <button type="button" className="btn btn-primary" onClick={openNewBus}>
              <Plus size={16} style={{ marginRight: 6 }} /> Add bus
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {db.buses.map((b) => (
              <div key={b.bus_id} className="glass" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 14 }}>
                <div>
                  <h4 style={{ margin: 0, fontWeight: 800 }}>Bus {b.bus_id}</h4>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Route {b.assigned_route_id ?? 'None'}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    className="btn"
                    style={{ padding: 8, background: 'rgba(255,255,255,0.1)' }}
                    onClick={() =>
                      setBusModal({
                        _edit: true,
                        bus_id: b.bus_id,
                        assigned_route_id: b.assigned_route_id ?? '',
                        status: b.status || 'On Time',
                        trip_active: !!b.trip_active,
                        current_stop: b.current_stop ?? '',
                        current_lat: b.current_lat ?? '',
                        current_lng: b.current_lng ?? '',
                      })
                    }
                  >
                    <Edit2 size={14} />
                  </button>
                  <button type="button" className="btn btn-alert" style={{ padding: 8 }} onClick={() => deleteBus(b.bus_id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'routes' && (
        <div className="animate-fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Routes</h3>
            <button type="button" className="btn btn-primary" onClick={openNewRoute}>
              <Plus size={16} style={{ marginRight: 6 }} /> Add route
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {db.routes.map((r) => (
              <div key={r.route_id} className="glass" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 14 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 style={{ margin: 0, fontWeight: 800 }}>{r.route_name}</h4>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 6, wordBreak: 'break-word' }}>
                    ID {r.route_id} · {getStopLabels(r.stops).join(' → ')}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    className="btn"
                    style={{ padding: 8, background: 'rgba(255,255,255,0.1)' }}
                    onClick={() => openEditRoute(r)}
                  >
                    <Edit2 size={14} />
                  </button>
                  <button type="button" className="btn btn-alert" style={{ padding: 8 }} onClick={() => deleteRoute(r.route_id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'drivers' && (
        <div className="animate-fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Drivers</h3>
            <button type="button" className="btn btn-primary" onClick={openNewDriver}>
              <Plus size={16} style={{ marginRight: 6 }} /> Add driver
            </button>
          </div>
          {dbDrivers.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No drivers yet.</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {dbDrivers.map((d) => (
              <div key={d.driver_id} className="glass" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 14 }}>
                <div>
                  <h4 style={{ margin: 0, fontWeight: 800 }}>{d.name}</h4>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    ID {d.driver_id} · Bus {d.assigned_bus_id ?? '—'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    className="btn"
                    style={{ padding: 8, background: 'rgba(255,255,255,0.1)' }}
                    onClick={() => openEditDriver(d)}
                  >
                    <Edit2 size={14} />
                  </button>
                  <button type="button" className="btn btn-alert" style={{ padding: 8 }} onClick={() => deleteDriver(d.driver_id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'emergency' && (
        <div className="glass-card animate-fade-in">
          <h2 className="title-alert" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, fontWeight: 800 }}>
            <ShieldAlert size={24} /> Emergency reassignment
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 18, lineHeight: 1.5 }}>
            Move <strong>route_id</strong> from a broken bus to a spare. Students follow the route, not the vehicle plate.
          </p>

          <form onSubmit={handleReassign}>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Route</label>
            <select className="input-glass" value={routeId} onChange={(e) => setRouteId(e.target.value)} required style={{ marginBottom: 14 }}>
              <option value="">Select route</option>
              {db.routes.map((r) => (
                <option key={r.route_id} value={r.route_id} style={{ color: '#0f172a' }}>
                  {r.route_name} ({r.route_id})
                </option>
              ))}
            </select>

            <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Bus leaving duty</label>
            <select className="input-glass" value={oldBus} onChange={(e) => setOldBus(e.target.value)} required style={{ marginBottom: 14 }}>
              <option value="">Select bus</option>
              {db.buses.map((b) => (
                <option key={b.bus_id} value={b.bus_id} style={{ color: '#0f172a' }}>
                  Bus {b.bus_id}
                </option>
              ))}
            </select>

            <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Replacement bus</label>
            <select className="input-glass" value={newBus} onChange={(e) => setNewBus(e.target.value)} required style={{ marginBottom: 18 }}>
              <option value="">Select bus</option>
              {db.buses.map((b) => (
                <option key={b.bus_id} value={b.bus_id} style={{ color: '#0f172a' }}>
                  Bus {b.bus_id}
                </option>
              ))}
            </select>

            <button type="submit" className="btn btn-alert" style={{ width: '100%' }}>
              Apply swap
            </button>
          </form>
        </div>
      )}

      <AnimatePresence>
        {busModal && (
          <Modal title="Bus" onClose={() => setBusModal(null)}>
            <label className="admin-label">Bus ID</label>
            <input
              className="input-glass"
              value={busModal.bus_id}
              disabled={!!busModal._edit}
              onChange={(e) => setBusModal({ ...busModal, bus_id: e.target.value })}
              style={{ marginBottom: 12 }}
            />
            <label className="admin-label">Assigned route_id</label>
            <input
              className="input-glass"
              value={busModal.assigned_route_id}
              onChange={(e) => setBusModal({ ...busModal, assigned_route_id: e.target.value })}
              style={{ marginBottom: 12 }}
            />
            <label className="admin-label">Status</label>
            <select
              className="input-glass"
              value={busModal.status}
              onChange={(e) => setBusModal({ ...busModal, status: e.target.value })}
              style={{ marginBottom: 12, color: 'white' }}
            >
              <option value="On Time" style={{ color: '#0f172a' }}>
                On Time
              </option>
              <option value="Delayed" style={{ color: '#0f172a' }}>
                Delayed
              </option>
              <option value="Emergency" style={{ color: '#0f172a' }}>
                Emergency
              </option>
            </select>
            <label className="admin-label">Trip active</label>
            <select
              className="input-glass"
              value={busModal.trip_active ? 'yes' : 'no'}
              onChange={(e) => setBusModal({ ...busModal, trip_active: e.target.value === 'yes' })}
              style={{ marginBottom: 12, color: 'white' }}
            >
              <option value="no" style={{ color: '#0f172a' }}>
                No
              </option>
              <option value="yes" style={{ color: '#0f172a' }}>
                Yes
              </option>
            </select>
            <label className="admin-label">Current stop</label>
            <input
              className="input-glass"
              value={busModal.current_stop}
              onChange={(e) => setBusModal({ ...busModal, current_stop: e.target.value })}
              style={{ marginBottom: 12 }}
            />
            <label className="admin-label">Latitude / Longitude</label>
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                className="input-glass"
                placeholder="lat"
                value={busModal.current_lat}
                onChange={(e) => setBusModal({ ...busModal, current_lat: e.target.value })}
                style={{ marginBottom: 12 }}
              />
              <input
                className="input-glass"
                placeholder="lng"
                value={busModal.current_lng}
                onChange={(e) => setBusModal({ ...busModal, current_lng: e.target.value })}
                style={{ marginBottom: 12 }}
              />
            </div>
            <button type="button" className="btn btn-primary" style={{ width: '100%' }} onClick={saveBus}>
              Save bus
            </button>
          </Modal>
        )}

        {routeModal && (
          <Modal title="Route" onClose={() => setRouteModal(null)}>
            <label className="admin-label">Route ID</label>
            <input
              className="input-glass"
              value={routeModal.route_id}
              disabled={!!routeModal._edit}
              onChange={(e) => setRouteModal({ ...routeModal, route_id: e.target.value })}
              style={{ marginBottom: 12 }}
            />
            <label className="admin-label">Route name</label>
            <input
              className="input-glass"
              value={routeModal.route_name}
              onChange={(e) => setRouteModal({ ...routeModal, route_name: e.target.value })}
              style={{ marginBottom: 12 }}
            />
            <label className="admin-label">Stops (JSON array or comma / newline separated)</label>
            <textarea
              className="input-glass"
              rows={5}
              value={routeModal.stops_text}
              onChange={(e) => setRouteModal({ ...routeModal, stops_text: e.target.value })}
              style={{ marginBottom: 12, fontFamily: 'monospace', fontSize: '0.85rem' }}
            />
            <button type="button" className="btn btn-primary" style={{ width: '100%' }} onClick={saveRoute}>
              Save route
            </button>
          </Modal>
        )}

        {driverModal && (
          <Modal title="Driver" onClose={() => setDriverModal(null)}>
            <label className="admin-label">Driver ID</label>
            <input
              className="input-glass"
              value={driverModal.driver_id}
              disabled={!!driverModal._edit}
              onChange={(e) => setDriverModal({ ...driverModal, driver_id: e.target.value })}
              style={{ marginBottom: 12 }}
            />
            <label className="admin-label">Name</label>
            <input
              className="input-glass"
              value={driverModal.name}
              onChange={(e) => setDriverModal({ ...driverModal, name: e.target.value })}
              style={{ marginBottom: 12 }}
            />
            <label className="admin-label">Phone</label>
            <input
              className="input-glass"
              value={driverModal.phone_number}
              onChange={(e) => setDriverModal({ ...driverModal, phone_number: e.target.value })}
              style={{ marginBottom: 12 }}
            />
            <label className="admin-label">Login email (for Supabase Auth + Driver ID login)</label>
            <input
              className="input-glass"
              type="email"
              value={driverModal.login_email}
              onChange={(e) => setDriverModal({ ...driverModal, login_email: e.target.value })}
              style={{ marginBottom: 12 }}
            />
            <label className="admin-label">Auth user_id (optional UUID)</label>
            <input
              className="input-glass"
              value={driverModal.user_id}
              onChange={(e) => setDriverModal({ ...driverModal, user_id: e.target.value })}
              style={{ marginBottom: 12 }}
            />
            <label className="admin-label">Assigned bus_id</label>
            <input
              className="input-glass"
              value={driverModal.assigned_bus_id}
              onChange={(e) => setDriverModal({ ...driverModal, assigned_bus_id: e.target.value })}
              style={{ marginBottom: 12 }}
            />
            <button type="button" className="btn btn-primary" style={{ width: '100%' }} onClick={saveDriver}>
              Save driver
            </button>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <Motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.72)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: 16,
        backdropFilter: 'blur(8px)',
      }}
      onClick={onClose}
    >
      <Motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        className="glass-card"
        style={{ width: '100%', maxWidth: 480, maxHeight: '85vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontWeight: 800 }}>{title}</h3>
          <button type="button" className="btn glass" style={{ padding: 8 }} onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        {children}
      </Motion.div>
    </Motion.div>
  );
}
