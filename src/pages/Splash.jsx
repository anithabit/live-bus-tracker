import React from 'react';
import { motion } from 'framer-motion';
import { BusFront, Navigation } from 'lucide-react';

export default function Splash() {
  return (
    <div style={{
      background: 'var(--grad-primary)',
      height: '100vh',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      position: 'absolute',
      top: 0,
      left: 0,
      zIndex: 9999
    }}>
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1, rotate: 360 }}
        transition={{ duration: 0.8, type: 'spring' }}
        className="glass-card"
        style={{ padding: '30px', borderRadius: '50%', marginBottom: '20px' }}
      >
        <BusFront size={64} color="white" />
      </motion.div>
      <motion.h1
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        style={{ fontSize: '2.5rem', fontWeight: 800, textAlign: 'center' }}
      >
        LiveTracker
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.5 }}
        style={{ color: 'rgba(255,255,255,0.7)', marginTop: '10px' }}
      >
        College Transport Management
      </motion.p>
      
      {/* Loading Pulse */}
      <motion.div
        animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
        transition={{ repeat: Infinity, duration: 1.5 }}
        style={{ marginTop: '50px' }}
      >
        <Navigation size={24} color="rgba(255,255,255,0.5)" />
      </motion.div>
    </div>
  );
}
