import React from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Camera, 
  Cpu, 
  CheckSquare, 
  Database, 
  Settings
} from 'lucide-react';

import Dashboard from './pages/Dashboard';
import CollectFaces from './pages/CollectFaces';
import Train from './pages/Train';
import MarkAttendance from './pages/MarkAttendance';
import ViewRecords from './pages/ViewRecords';
import ManageEmbeddings from './pages/ManageEmbeddings';

function App() {
  return (
    <Router>
      <div className="app-container">
        {/* Sidebar Nav */}
        <aside className="sidebar">
          <div className="sidebar-header">
            <h2 className="sidebar-title">✨ Attendance System</h2>
            <div className="sub-header-muted">BPPIMT Face Portal</div>
          </div>
          
          <div className="sidebar-divider"></div>
          
          <nav className="nav-menu">
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
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="main-content">
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
