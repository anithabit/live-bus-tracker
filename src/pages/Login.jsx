import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Key, BusFront } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Login() {
  const [role, setRole] = useState('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // Broadly scan on auto-reconnect to determine correct dashboard
        const { data: driver } = await supabase.from('drivers').select('*').eq('user_id', session.user.id).single();
        if (driver) return navigate('/driver');
        const { data: admin } = await supabase.from('admins').select('*').eq('user_id', session.user.id).single();
        if (admin) return navigate('/admin');
        navigate('/student');
      }
    };
    checkSession();
  }, []);

  const checkRoleAndRedirect = async (userId, currentRole) => {
    if (currentRole === 'driver') {
      const { data: driver } = await supabase.from('drivers').select('*').eq('user_id', userId).single();
      if (driver) return navigate('/driver');
      alert("Error: You are not registered as a Driver.");
      await supabase.auth.signOut();
      return;
    }

    if (currentRole === 'admin') {
      const { data: admin } = await supabase.from('admins').select('*').eq('user_id', userId).single();
      if (admin) return navigate('/admin');
      alert("Error: You are not registered as an Admin.");
      await supabase.auth.signOut();
      return;
    }

    return navigate('/student');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      alert("Login Error: " + error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      await checkRoleAndRedirect(data.user.id, role);
    }
  };

  return (
    <div className="scroll-area animate-fade-in" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100vh', padding: '20px' }}>
      <div className="logo-container animate-fade-in">
        <BusFront size={40} color="white" />
      </div>
      
      <h1 className="title-gradient" style={{ textAlign: 'center', fontSize: '2.5rem', marginBottom: '10px' }}>
        LiveTracker
      </h1>
      <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '40px' }}>
        Log in to access your dashboard
      </p>

      <div className="glass-card">
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          {['student', 'driver', 'admin'].map(r => (
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
            <Mail size={18} color="rgba(255,255,255,0.5)" style={{ position: 'absolute', top: '15px', left: '15px' }} />
            <input 
               type="email" 
               placeholder="Email Address" 
               className="input-glass" 
               style={{ paddingLeft: '45px', width: '100%' }} 
               value={email}
               onChange={e => setEmail(e.target.value)}
               required 
            />
          </div>
          
          <div style={{ position: 'relative', marginBottom: '30px' }}>
            <Key size={18} color="rgba(255,255,255,0.5)" style={{ position: 'absolute', top: '15px', left: '15px' }} />
            <input 
                type="password" 
                placeholder="Password" 
                className="input-glass" 
                style={{ paddingLeft: '45px', width: '100%' }} 
                value={password}
                onChange={e => setPassword(e.target.value)}
                required 
            />
          </div>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', padding: '15px', fontSize: '1.2rem', opacity: loading ? 0.7 : 1 }}
            type="submit"
          >
            {loading ? 'Authenticating...' : `Login as ${role.charAt(0).toUpperCase() + role.slice(1)}`}
          </motion.button>

          {role === 'student' && (
            <div style={{ textAlign: 'center', marginTop: '15px' }}>
              <Link to="/register" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.9rem' }}>
                Don't have an account? <span style={{ color: '#c026d3', fontWeight: 'bold' }}>Register here</span>
              </Link>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
