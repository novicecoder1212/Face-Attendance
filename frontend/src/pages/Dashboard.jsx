import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, FileSpreadsheet, ClipboardList, Info, HelpCircle } from 'lucide-react';
import { API_URL } from '../utils/api';

function Dashboard() {
  const [stats, setStats] = useState({
    registeredUsers: 0,
    totalRecords: 0,
    loading: true
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const usersRes = await fetch(`${API_URL}/api/users`);
        const users = await usersRes.json();
        
        const attendanceRes = await fetch(`${API_URL}/api/attendance`);
        const records = await attendanceRes.json();

        setStats({
          registeredUsers: users.length,
          totalRecords: records.length,
          loading: false
        });
      } catch (err) {
        console.error('Error fetching statistics:', err);
        setStats(prev => ({ ...prev, loading: false }));
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="animate-fade-in">
      {/* Institution Banner */}
      <div className="institute-header">
        <p className="main-header">✨ Face Recognition Attendance System ✨</p>
        <h1 className="sub-header">B.P. Poddar Institute of Management & Technology</h1>
        <p className="sub-header-muted">Approved by AICTE, New Delhi & Affiliated to MAKAUT, W.B</p>
      </div>

      <div className="glass-card">
        <h2 style={{ marginBottom: '0.5rem', fontWeight: 700 }}>👋 Welcome to B.P.P.I.M.T Attendance System</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          A modern, AI-powered system for seamless and secure attendance tracking using client-side facial recognition.
        </p>
      </div>

      {/* Quick Action Navigation Grid */}
      <div className="grid-3">
        <div className="glass-card info-card">
          <h3>📸 Collect Faces</h3>
          <p style={{ marginBottom: '1.5rem' }}>
            Register new students by capturing multiple angles of their face using the webcam. This collects high-quality sample images.
          </p>
          <Link to="/collect" className="btn btn-primary" style={{ width: '100%' }}>
            Start Capture
          </Link>
        </div>

        <div className="glass-card info-card">
          <h3>🧠 Train Model</h3>
          <p style={{ marginBottom: '1.5rem' }}>
            Process the collected facial data to extract descriptors (embeddings) in the browser and store them in the backend database.
          </p>
          <Link to="/train" className="btn btn-primary" style={{ width: '100%' }}>
            Train Model
          </Link>
        </div>

        <div className="glass-card info-card">
          <h3>✅ Mark Attendance</h3>
          <p style={{ marginBottom: '1.5rem' }}>
            Open the real-time webcam module to automatically recognize student faces, verify liveness, and record attendance in the database.
          </p>
          <Link to="/mark-attendance" className="btn btn-primary" style={{ width: '100%' }}>
            Start Attendance
          </Link>
        </div>
      </div>

      {/* Metrics Section */}
      <h2 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <ClipboardList size={22} color="#a78bfa" />
        <span>System Status</span>
      </h2>
      
      <div className="metrics-row">
        <div className="metric-card">
          <div className="metric-icon-wrapper">
            <Users size={28} />
          </div>
          <div className="metric-info">
            <span className="metric-value">{stats.loading ? '...' : stats.registeredUsers}</span>
            <span className="metric-label">Registered Students</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrapper">
            <FileSpreadsheet size={28} />
          </div>
          <div className="metric-info">
            <span className="metric-value">{stats.loading ? '...' : stats.totalRecords}</span>
            <span className="metric-label">Total Attendance Records</span>
          </div>
        </div>
      </div>

      {/* Instruction Steps */}
      <div className="glass-card">
        <h3 style={{ color: '#a78bfa', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <HelpCircle size={20} />
          <span>Quick Setup & Run Guide</span>
        </h3>
        <ul style={{ paddingLeft: '1.5rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <li>
            <strong>1. Collect Faces:</strong> Go to the Collect page, input University ID and Student Name, and stand in front of the camera to take 50 face captures.
          </li>
          <li>
            <strong>2. Train Model:</strong> Proceed to the Train page, select the student, and hit "Train" to process the captures into local face embeddings.
          </li>
          <li>
            <strong>3. Mark Attendance:</strong> Go to the Mark Attendance page. The system will start webcam recognition. Blinking and turning your head slightly verifies your identity as "LIVE" and updates the attendance CSV log.
          </li>
          <li>
            <strong>4. View Records:</strong> Check the History records to view or export attendance sheets to CSV.
          </li>
        </ul>
      </div>
    </div>
  );
}

export default Dashboard;
