import React from 'react';
import { motion as Motion } from 'framer-motion';
import { BusFront, Navigation } from 'lucide-react';

export default function Splash() {
  return (
    <div className="splash-fullscreen">
      <div className="splash-gradient-shift" />
      <Motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1, rotate: [0, 8, -8, 0] }}
        transition={{ duration: 1, type: 'spring' }}
        className="glass-card splash-bus-glow"
        style={{ padding: '32px', borderRadius: '50%', marginBottom: '24px', zIndex: 1 }}
      >
        <BusFront size={72} color="white" strokeWidth={2.2} />
      </Motion.div>
      <Motion.h1
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.35, duration: 0.55 }}
        style={{
          fontSize: 'clamp(1.5rem, 5vw, 2.25rem)',
          fontWeight: 800,
          textAlign: 'center',
          color: '#fff',
          textShadow: '0 4px 24px rgba(99, 102, 241, 0.5)',
          zIndex: 1,
          padding: '0 16px',
          lineHeight: 1.2,
        }}
      >
        Live Bus Tracking System
      </Motion.h1>
      <Motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.75, duration: 0.5 }}
        style={{ color: 'rgba(255,255,255,0.82)', marginTop: '12px', fontWeight: 600, zIndex: 1 }}
      >
        College Transport Management
      </Motion.p>

      <Motion.div
        animate={{ scale: [1, 1.35, 1], opacity: [0.45, 1, 0.45] }}
        transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
        style={{ marginTop: '48px', zIndex: 1 }}
      >
        <Navigation size={28} color="rgba(255,255,255,0.65)" />
      </Motion.div>
    </div>
  );
}
