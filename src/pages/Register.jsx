import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';
import { Mail, Key, User, UserPlus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import BackNavButton from '../components/BackNavButton';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!supabase) {
      alert('App is not connected to Supabase.');
      return;
    }
    if (password !== confirmPassword) {
      alert('Passwords do not match.');
      return;
    }
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });

    if (error) {
      alert('Registration error: ' + error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      const row = {
        email: email.trim(),
        name: name.trim() || email.split('@')[0],
      };
      if (data.user.id) row.user_id = data.user.id;

      const { error: insErr } = await supabase.from('students').insert(row);
      if (insErr && import.meta.env.DEV) {
        console.warn('students insert:', insErr.message);
      }

      alert('Account created. You can sign in as a student (check email confirmation if enabled).');
      navigate('/login');
    }
    setLoading(false);
  };

  return (
    <div
      className="scroll-area animate-fade-in"
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '20px',
        position: 'relative',
      }}
    >
      <BackNavButton
        label="Back"
        onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/login'))}
        style={{ position: 'absolute', top: 16, left: 16, zIndex: 10 }}
      />
      <div className="logo-container animate-fade-in">
        <UserPlus size={40} color="white" />
      </div>

      <h1 className="title-gradient" style={{ textAlign: 'center', fontSize: '2.5rem', marginBottom: '10px' }}>
        Student sign up
      </h1>
      <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '36px' }}>
        Use your college email or student ID email
      </p>

      <div className="glass-card" style={{ maxWidth: 440, margin: '0 auto', width: '100%' }}>
        <form onSubmit={handleRegister}>
          <div style={{ position: 'relative', marginBottom: '15px' }}>
            <User
              size={18}
              color="rgba(255,255,255,0.5)"
              style={{ position: 'absolute', top: '15px', left: '15px' }}
            />
            <input
              type="text"
              placeholder="Full name"
              className="input-glass"
              style={{ paddingLeft: '45px', width: '100%' }}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div style={{ position: 'relative', marginBottom: '15px' }}>
            <Mail
              size={18}
              color="rgba(255,255,255,0.5)"
              style={{ position: 'absolute', top: '15px', left: '15px' }}
            />
            <input
              type="email"
              placeholder="College email"
              className="input-glass"
              style={{ paddingLeft: '45px', width: '100%' }}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div style={{ position: 'relative', marginBottom: '15px' }}>
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
              placeholder="Confirm password"
              className="input-glass"
              style={{ paddingLeft: '45px', width: '100%' }}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
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
            {loading ? 'Creating account…' : 'Register'}
          </Motion.button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <Link to="/login" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.9rem' }}>
            Already registered? <span style={{ color: '#e879f9', fontWeight: 700 }}>Sign in</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
