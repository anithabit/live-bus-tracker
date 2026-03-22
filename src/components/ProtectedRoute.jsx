import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';
import { BusFront } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function ProtectedRoute({ role, children }) {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!supabase) {
        navigate('/login');
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        navigate('/login');
        return;
      }

      const uid = session.user.id;

      if (role === 'student') {
        const { data: driverRow } = await supabase
          .from('drivers')
          .select('driver_id')
          .eq('user_id', uid)
          .maybeSingle();
        const { data: adminRow } = await supabase
          .from('admins')
          .select('admin_id')
          .eq('user_id', uid)
          .maybeSingle();
        if (driverRow) {
          navigate('/driver', { replace: true });
          return;
        }
        if (adminRow) {
          navigate('/admin', { replace: true });
          return;
        }
      }

      if (role === 'driver') {
        const { data: driverRow } = await supabase
          .from('drivers')
          .select('driver_id')
          .eq('user_id', uid)
          .maybeSingle();
        if (!driverRow) {
          await supabase.auth.signOut();
          navigate('/login', { replace: true });
          return;
        }
      }

      if (role === 'admin') {
        const { data: adminRow } = await supabase
          .from('admins')
          .select('admin_id')
          .eq('user_id', uid)
          .maybeSingle();
        if (!adminRow) {
          await supabase.auth.signOut();
          navigate('/login', { replace: true });
          return;
        }
      }

      if (!cancelled) setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [role, navigate]);

  if (!ready) {
    return (
      <div
        className="splash-loading-screen"
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
        }}
      >
        <Motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
          className="glass-card"
          style={{
            padding: 24,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)',
          }}
        >
          <BusFront size={48} color="white" />
        </Motion.div>
        <p className="title-gradient" style={{ fontSize: '1.1rem', fontWeight: 700 }}>
          Verifying session…
        </p>
      </div>
    );
  }

  return children;
}
