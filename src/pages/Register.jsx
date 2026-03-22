import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Key, UserPlus } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({ email, password });
    
    if (error) {
      alert("Registration Error: " + error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      alert("Registration successful! You can now login as Student.");
      navigate('/login');
    }
  };

  return (
    <div className="scroll-area animate-fade-in" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100vh', padding: '20px' }}>
      <div className="logo-container animate-fade-in">
        <UserPlus size={40} color="white" />
      </div>
      
      <h1 className="title-gradient" style={{ textAlign: 'center', fontSize: '2.5rem', marginBottom: '10px' }}>
        Create Account
      </h1>
      <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '40px' }}>
        Student registration portal
      </p>

      <div className="glass-card" style={{ maxWidth: '400px', margin: '0 auto', width: '100%' }}>
        <form onSubmit={handleRegister}>
          <div style={{ position: 'relative', marginBottom: '15px' }}>
             <Mail size={18} color="rgba(255,255,255,0.5)" style={{ position: 'absolute', top: '15px', left: '15px' }} />
             <input 
                type="email" 
                placeholder="Student ID (Email)" 
                className="input-glass" 
                style={{ paddingLeft: '45px', width: '100%' }} 
                value={email}
                onChange={e => setEmail(e.target.value)}
                required 
             />
          </div>
          
          <div style={{ position: 'relative', marginBottom: '15px' }}>
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

          <div style={{ position: 'relative', marginBottom: '30px' }}>
             <Key size={18} color="rgba(255,255,255,0.5)" style={{ position: 'absolute', top: '15px', left: '15px' }} />
             <input 
                 type="password" 
                 placeholder="Confirm Password" 
                 className="input-glass" 
                 style={{ paddingLeft: '45px', width: '100%' }} 
                 value={confirmPassword}
                 onChange={e => setConfirmPassword(e.target.value)}
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
            {loading ? 'Registering...' : 'Complete Sign Up'}
          </motion.button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
           <Link to="/login" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.9rem' }}>
              Already have an account? <span style={{ color: '#c026d3', fontWeight: 'bold' }}>Login here</span>
           </Link>
        </div>
      </div>
    </div>
  );
}
