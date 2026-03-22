import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Splash from './pages/Splash';
import Login from './pages/Login';
import Register from './pages/Register';
import StudentMap from './pages/StudentMap';
import DriverPanel from './pages/DriverPanel';
import AdminDashboard from './pages/AdminDashboard';

export default function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Supabase auth checking is done locally inside Login/App naturally now
    setTimeout(() => setLoading(false), 2500); // Splash screen duration
  }, []);

  if (loading) {
    return <Splash />;
  }

  return (
    <Router>
      <div className="app-container">
        <Routes>
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/student" element={<StudentMap />} />
          <Route path="/driver" element={<DriverPanel />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
      </div>
    </Router>
  );
}
