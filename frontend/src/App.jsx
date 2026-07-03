import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Camera, 
  Cpu, 
  CheckSquare, 
  Database, 
  Settings,
  LogOut,
  Sun,
  Moon,
  User
} from 'lucide-react';

import Dashboard from './pages/Dashboard';
import CollectFaces from './pages/CollectFaces';
import Train from './pages/Train';
import MarkAttendance from './pages/MarkAttendance';
import ViewRecords from './pages/ViewRecords';
import ManageEmbeddings from './pages/ManageEmbeddings';

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username.toUpperCase() === 'TEST' && password.toUpperCase() === 'TEST') {
      onLogin();
    } else {
      setError('Invalid username or password.');
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-logo">
          <h1>✨ Attendance Portal</h1>
          <p>Teacher Authorization System</p>
        </div>
        {error && (
          <div className="alert alert-danger" style={{ padding: '0.75rem 1rem', borderRadius: '12px', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            <span>{error}</span>
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required 
            />
          </div>
          <div className="form-group" style={{ marginBottom: '2rem' }}>
            <label className="form-label">Password</label>
            <input 
              type="password" 
              className="input-field" 
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
            Authorize Login
          </button>
        </form>
      </div>
    </div>
  );
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(
    localStorage.getItem('teacherLoggedIn') === 'true'
  );

  const [isDarkMode, setIsDarkMode] = useState(
    localStorage.getItem('theme') === 'dark'
  );

  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const handleLogin = () => {
    localStorage.setItem('teacherLoggedIn', 'true');
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('teacherLoggedIn');
    setIsLoggedIn(false);
  };

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Router>
      <div className="app-container">
        {/* Sidebar Nav */}
        <aside className="sidebar">
          <div className="sidebar-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <img 
              src="/bppimt_logo.png" 
              alt="BPPIMT Logo" 
              style={{ 
                maxWidth: '65px', 
                height: 'auto', 
                filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.1))',
                marginBottom: '0.25rem'
              }} 
            />
            <h2 className="sidebar-title" style={{ fontSize: '1.15rem', fontWeight: '800' }}>BPPIMT Portal</h2>
            <div className="sub-header-muted" style={{ fontSize: '0.75rem', fontWeight: '600' }}>CSE Face-Attendance</div>
          </div>
          
          <div className="sidebar-divider"></div>
          
          <nav className="nav-menu" style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
            <ul className="nav-links">
              <li className="nav-item">
                <NavLink to="/" end>
                  <LayoutDashboard size={18} />
                  <span>Dashboard</span>
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink to="/collect">
                  <Camera size={18} />
                  <span>Collect Faces</span>
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink to="/train">
                  <Cpu size={18} />
                  <span>Train Model</span>
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink to="/mark-attendance">
                  <CheckSquare size={18} />
                  <span>Mark Attendance</span>
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink to="/records">
                  <Database size={18} />
                  <span>View Records</span>
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink to="/manage">
                  <Settings size={18} />
                  <span>Manage System</span>
                </NavLink>
              </li>
            </ul>

            {/* Professor Profile Card at bottom of sidebar */}
            <div className="sidebar-profile-card" style={{ marginTop: 'auto', paddingTop: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.12)', textAlign: 'left' }}>
              <div className="profile-name" style={{ color: '#ffffff', fontSize: '0.95rem', fontWeight: '700' }}>Prof. RK Sen</div>
              <div className="profile-role" style={{ color: '#93c5fd', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', marginTop: '0.15rem' }}>Assistant Professor</div>
              <div className="profile-dept" style={{ color: '#cbd5e1', fontSize: '0.75rem', marginTop: '0.1rem' }}>Computer Science & Eng.</div>
              
              <button 
                className="logout-btn" 
                onClick={handleLogout}
                style={{ 
                  marginTop: '0.75rem', 
                  padding: '0.65rem 1rem', 
                  fontSize: '0.8rem',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  color: '#fca5a5'
                }}
              >
                <LogOut size={14} />
                <span>Log Out</span>
              </button>
            </div>
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="main-content" style={{ position: 'relative' }}>
          {/* Day/Night Theme Switch circular trigger */}
          <div className="profile-menu-container">
            <button 
              className="profile-avatar-btn" 
              onClick={() => setDropdownOpen(!dropdownOpen)}
              title="Theme Switch Options"
            >
              <User size={18} />
            </button>
            
            {dropdownOpen && (
              <div className="profile-dropdown-card" style={{ width: '220px' }}>
                <div className="dropdown-item" style={{ padding: '0.25rem 0' }}>
                  <span className="dropdown-label">Theme Mode</span>
                  <button 
                    className="theme-switch-btn" 
                    onClick={() => setIsDarkMode(!isDarkMode)}
                  >
                    {isDarkMode ? (
                      <>
                        <Sun size={14} color="#fca5a5" />
                        <span>Day Mode</span>
                      </>
                    ) : (
                      <>
                        <Moon size={14} color="#3b82f6" />
                        <span>Night Mode</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/collect" element={<CollectFaces />} />
            <Route path="/train" element={<Train />} />
            <Route path="/mark-attendance" element={<MarkAttendance />} />
            <Route path="/records" element={<ViewRecords />} />
            <Route path="/manage" element={<ManageEmbeddings />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
