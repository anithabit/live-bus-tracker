import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';
import { Mail, Key, BusFront } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { resolveDriverAuthEmail } from '../lib/authHelpers';

export default function Login() {
  const [role, setRole] = useState('student');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!supabase) return;

    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data: driver } = await supabase
        .from('drivers')
        .select('driver_id')
        .eq('user_id', session.user.id)
        .maybeSingle();
      if (driver) {
        navigate('/driver', { replace: true });
        return;
      }
      const { data: admin } = await supabase
        .from('admins')
        .select('admin_id')
        .eq('user_id', session.user.id)
        .maybeSingle();
      if (admin) {
        navigate('/admin', { replace: true });
        return;
      }
      navigate('/student', { replace: true });
    };

    checkSession();
  }, [navigate]);

  const checkRoleAndRedirect = async (userId, currentRole) => {
    if (currentRole === 'driver') {
      const { data: driver } = await supabase
        .from('drivers')
        .select('driver_id')
        .eq('user_id', userId)
        .maybeSingle();
      if (driver) {
        navigate('/driver');
        return;
      }
      alert('You are not registered as a driver in this system.');
      await supabase.auth.signOut();
      return;
    }

    if (currentRole === 'admin') {
      const { data: admin } = await supabase
        .from('admins')
        .select('admin_id')
        .eq('user_id', userId)
        .maybeSingle();
      if (admin) {
        navigate('/admin');
        return;
      }
      alert('You are not registered as an admin.');
      await supabase.auth.signOut();
      return;
    }

    navigate('/student');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!supabase) {
      alert('App is not connected to Supabase. Check environment variables.');
      return;
    }

    setLoading(true);

    let email = identifier.trim();
    if (role === 'driver') {
      const resolved = await resolveDriverAuthEmail(identifier);
      if (resolved.error || !resolved.email) {
        alert(resolved.error || 'Could not resolve driver login.');
        setLoading(false);
        return;
      }
      email = resolved.email;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert('Login error: ' + error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      await checkRoleAndRedirect(data.user.id, role);
    }
    setLoading(false);
  };

  const placeholder =
    role === 'driver'
      ? 'Driver ID or email'
      : role === 'admin'
        ? 'Admin email'
        : 'College email';

  return (
    <div
      className="scroll-area animate-fade-in"
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '20px',
      }}
    >
      <div className="logo-container animate-fade-in">
        <BusFront size={40} color="white" />
      </div>

      <h1 className="title-gradient" style={{ textAlign: 'center', fontSize: '2.5rem', marginBottom: '10px' }}>
        Live Bus Tracking
      </h1>
      <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '36px' }}>
        College transport — sign in to continue
      </p>

      <div className="glass-card" style={{ maxWidth: 440, margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          {['student', 'driver', 'admin'].map((r) => (
            <button
              key={r}
              type="button"
              className={`btn ${role === r ? 'btn-primary' : 'glass'}`}
              style={{ flex: 1, textTransform: 'capitalize', fontSize: '0.8rem', padding: '10px' }}
              onClick={() => setRole(r)}
            >
              {r}
            </button>
          ))}
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ position: 'relative', marginBottom: '15px' }}>
            <Mail
              size={18}
              color="rgba(255,255,255,0.5)"
              style={{ position: 'absolute', top: '15px', left: '15px' }}
            />
            <input
              type="text"
              placeholder={placeholder}
              className="input-glass"
              style={{ paddingLeft: '45px', width: '100%' }}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              autoComplete="username"
            />
          </div>

          <div style={{ position: 'relative', marginBottom: '28px' }}>
            <Key
              size={18}
              color="rgba(255,255,255,0.5)"
              style={{ position: 'absolute', top: '15px', left: '15px' }}
            />
            <input
              type="password"
              placeholder="Password"
              className="input-glass"
              style={{ paddingLeft: '45px', width: '100%' }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <Motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', padding: '15px', fontSize: '1.1rem', opacity: loading ? 0.75 : 1 }}
            type="submit"
          >
            {loading ? 'Signing in…' : `Continue as ${role.charAt(0).toUpperCase() + role.slice(1)}`}
          </Motion.button>

          {role === 'student' && (
            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <Link to="/register" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.9rem' }}>
                New student?{' '}
                <span style={{ color: '#e879f9', fontWeight: 700 }}>Create account</span>
              </Link>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
