import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Download, 
  Search, 
  RefreshCw, 
  Calendar, 
  Loader2, 
  TrendingUp, 
  AlertTriangle, 
  Users, 
  BarChart3, 
  FileSpreadsheet 
} from 'lucide-react';
import { API_URL } from '../utils/api';

function ViewRecords() {
  const [records, setRecords] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('history'); // 'history' or 'analytics'

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/attendance`);
      const data = await res.json();
      // Sort newest records first
      const sorted = data.reverse();
      setRecords(sorted);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching attendance logs:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleExportCSV = () => {
    if (records.length === 0) return;

    // Build CSV content
    const headers = ['ID', 'Name', 'Date_Time'];
    const rows = records.map(r => [r.id, r.name, r.dateTime]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.join(','))
    ].join('\n');

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Attendance_Report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter logs by search query (only for History view)
  const filteredRecords = records.filter(r => {
    const query = searchQuery.toLowerCase();
    return (
      r.id.toLowerCase().includes(query) ||
      r.name.toLowerCase().includes(query) ||
      r.dateTime.toLowerCase().includes(query)
    );
  });

  // --- ANALYTICS COMPUTATIONS ---
  // 1. Unique Class Dates (Total Lectures Held)
  const uniqueDates = [...new Set(records.map(r => r.dateTime.split(' ')[0]))];

  // 2. Attendance stats per student
  const studentStats = {};
  records.forEach(r => {
    const dateOnly = r.dateTime.split(' ')[0];
    if (!studentStats[r.id]) {
      studentStats[r.id] = {
        id: r.id,
        name: r.name,
        datesPresent: new Set()
      };
    }
    studentStats[r.id].datesPresent.add(dateOnly);
  });

  const studentsList = Object.values(studentStats).map(s => {
    const totalPresent = s.datesPresent.size;
    const attendanceRate = uniqueDates.length > 0 
      ? Math.round((totalPresent / uniqueDates.length) * 100) 
      : 100;
    return {
      id: s.id,
      name: s.name,
      totalPresent,
      attendanceRate
    };
  });

  // 3. Class average attendance percentage
  const classAvg = studentsList.length > 0 
    ? Math.round(studentsList.reduce((acc, curr) => acc + curr.attendanceRate, 0) / studentsList.length) 
    : 0;

  // 4. Students below 75% attendance
  const below75 = studentsList.filter(s => s.attendanceRate < 75);

  // 5. Daily Attendance Volumes (Chronological for Chart)
  const chronologicalDates = [...uniqueDates].sort((a, b) => new Date(a) - new Date(b));
  const chartData = chronologicalDates.map(date => {
    const count = records.filter(r => r.dateTime.split(' ')[0] === date).length;
    return { date, count };
  });

  return (
    <div className="animate-fade-in">
      <div className="institute-header">
        <p className="main-header">📊 Records & Analytics</p>
        <h1 className="sub-header">BPPIMT Class Attendance System</h1>
      </div>

      {/* Tab Switcher */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--card-border)', paddingBottom: '1rem' }}>
        <button 
          onClick={() => setActiveTab('history')}
          className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '0.65rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Database size={16} />
          <span>Attendance History</span>
        </button>
        <button 
          onClick={() => setActiveTab('analytics')}
          className={`btn ${activeTab === 'analytics' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '0.65rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <BarChart3 size={16} />
          <span>Class Analytics</span>
        </button>
      </div>

      {activeTab === 'history' ? (
        <div className="glass-card">
          <div 
            style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              flexWrap: 'wrap',
              gap: '1rem',
              marginBottom: '1.5rem' 
            }}
          >
            {/* Search bar */}
            <div style={{ position: 'relative', flexGrow: 1, maxWidth: '400px' }}>
              <Search 
                size={18} 
                color="var(--text-muted)" 
                style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} 
              />
              <input
                type="text"
                className="input-field"
                placeholder="Search by name, ID or date..."
                style={{ paddingLeft: '2.8rem' }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={fetchRecords} className="btn btn-secondary">
                <RefreshCw size={16} />
                <span>Refresh</span>
              </button>
              <button 
                onClick={handleExportCSV} 
                className="btn btn-primary"
                disabled={records.length === 0}
              >
                <Download size={16} />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex-center" style={{ padding: '4rem', flexDirection: 'column' }}>
              <Loader2 className="animate-spin" size={32} color="var(--primary)" style={{ marginBottom: '1rem' }} />
              <p style={{ color: 'var(--text-muted)' }}>Loading historical records...</p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
              <Database size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
              <h3>No Records Found</h3>
              <p style={{ fontSize: '0.9rem' }}>No attendance marks matching your query are currently logged.</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>University ID</th>
                    <th>Student Name</th>
                    <th>Date & Time</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((rec, index) => (
                    <tr key={index}>
                      <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                        {rec.id.includes('_') ? rec.id.split('_')[0] : rec.id}
                      </td>
                      <td>{rec.name}</td>
                      <td style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: 'none' }}>
                        <Calendar size={14} color="var(--primary-hover)" />
                        <span>{rec.dateTime}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="animate-fade-in">
          {/* Summary Cards */}
          <div className="metrics-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
            <div className="metric-card">
              <div className="metric-icon-wrapper" style={{ background: 'rgba(46, 48, 146, 0.08)' }}>
                <Calendar size={28} />
              </div>
              <div className="metric-info">
                <span className="metric-value">{uniqueDates.length}</span>
                <span className="metric-label">Total Classes Held</span>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.08)', color: 'var(--success)' }}>
                <TrendingUp size={28} />
              </div>
              <div className="metric-info">
                <span className="metric-value">{classAvg}%</span>
                <span className="metric-label">Average Attendance</span>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon-wrapper" style={{ background: 'rgba(239, 68, 68, 0.08)', color: 'var(--danger)' }}>
                <AlertTriangle size={28} />
              </div>
              <div className="metric-info">
                <span className="metric-value">{below75.length}</span>
                <span className="metric-label">Students Below 75%</span>
              </div>
            </div>
          </div>

          {/* SVG Bar Chart Card */}
          <div className="glass-card" style={{ padding: '2rem', marginBottom: '2.5rem' }}>
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary-hover)' }}>
              <BarChart3 size={22} />
              <span>Attendance Volume per Lecture Date</span>
            </h3>
            
            {chartData.length === 0 ? (
              <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No historical records to construct chart.
              </div>
            ) : (
              <div style={{ width: '100%', overflowX: 'auto' }}>
                <svg viewBox="0 0 800 240" style={{ width: '100%', minWidth: '600px', height: 'auto', overflow: 'visible' }}>
                  {/* Grid lines */}
                  <line x1="50" y1="30" x2="750" y2="30" stroke="var(--card-border)" strokeDasharray="4 4" />
                  <line x1="50" y1="90" x2="750" y2="90" stroke="var(--card-border)" strokeDasharray="4 4" />
                  <line x1="50" y1="150" x2="750" y2="150" stroke="var(--card-border)" strokeDasharray="4 4" />
                  <line x1="50" y1="210" x2="750" y2="210" stroke="var(--card-border)" />
                  
                  {/* Chart bars */}
                  {chartData.map((d, i) => {
                    const barWidth = 40;
                    const maxVal = Math.max(...chartData.map(c => c.count), 1);
                    const barHeight = (d.count / maxVal) * 150; // Max height 150px
                    const spacing = 700 / (chartData.length || 1);
                    const x = 50 + (i * spacing) + (spacing - barWidth) / 2;
                    const y = 210 - barHeight;
                    
                    return (
                      <g key={i}>
                        {/* Bar with rounded corners at top */}
                        <rect 
                          x={x} 
                          y={y} 
                          width={barWidth} 
                          height={barHeight} 
                          fill="url(#barGradient)" 
                          rx="4" 
                        />
                        {/* Bar count badge */}
                        <text 
                          x={x + barWidth / 2} 
                          y={y - 8} 
                          textAnchor="middle" 
                          fill="var(--text-main)" 
                          fontSize="11" 
                          fontWeight="700"
                        >
                          {d.count}
                        </text>
                        {/* X-axis Date label */}
                        <text 
                          x={x + barWidth / 2} 
                          y="228" 
                          textAnchor="middle" 
                          fill="var(--text-muted)" 
                          fontSize="10" 
                          fontWeight="600"
                        >
                          {d.date}
                        </text>
                      </g>
                    );
                  })}
                  
                  {/* Gradients */}
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary-hover)" />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.4" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
            {/* Low Attendance Warning Alert Panel */}
            <div className="glass-card" style={{ borderLeft: '4px solid var(--danger)' }}>
              <h3 style={{ color: 'var(--danger)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={20} />
                <span>Critical Absentees Alert (&lt; 75%)</span>
              </h3>
              
              {below75.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  🎉 Awesome! All students have attendance above 75%.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '350px', overflowY: 'auto' }}>
                  {below75.map((s, i) => (
                    <div key={i} style={{ background: 'rgba(239, 68, 68, 0.04)', border: '1px solid rgba(239, 68, 68, 0.15)', borderRadius: '12px', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '0.95rem' }}>{s.name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>ID: {s.id.includes('_') ? s.id.split('_')[0] : s.id}</div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <span style={{ color: 'var(--danger)', fontWeight: '800', fontSize: '1.1rem' }}>{s.attendanceRate}%</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.totalPresent}/{uniqueDates.length} days</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Individual Student Search Directory */}
            <div className="glass-card">
              <h3 style={{ color: 'var(--primary-hover)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={20} />
                <span>Query Student Attendance Profile</span>
              </h3>
              
              <div style={{ position: 'relative', marginBottom: '1rem' }}>
                <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Type student name or ID..." 
                  style={{ paddingLeft: '2.5rem' }}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {searchQuery ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '280px', overflowY: 'auto' }}>
                  {studentsList
                    .filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.id.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((s, i) => {
                      const isDanger = s.attendanceRate < 75;
                      return (
                        <div key={i} style={{ background: 'var(--bg-dark)', border: '1px solid var(--card-border)', borderRadius: '12px', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '0.95rem' }}>{s.name}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ID: {s.id.includes('_') ? s.id.split('_')[0] : s.id}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ color: isDanger ? 'var(--danger)' : 'var(--success)', fontWeight: '800', fontSize: '1.05rem' }}>{s.attendanceRate}%</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.totalPresent} present</div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Enter student details above to query profile report.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ViewRecords;
