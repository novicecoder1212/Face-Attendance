import React, { useState, useEffect } from 'react';
import { Database, Download, Search, RefreshCw, Calendar, Loader2 } from 'lucide-react';
import { API_URL } from '../utils/api';

function ViewRecords() {
  const [records, setRecords] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

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

  // Filter logs by search query
  const filteredRecords = records.filter(r => {
    const query = searchQuery.toLowerCase();
    return (
      r.id.toLowerCase().includes(query) ||
      r.name.toLowerCase().includes(query) ||
      r.dateTime.toLowerCase().includes(query)
    );
  });

  return (
    <div className="animate-fade-in">
      <div className="institute-header">
        <p className="main-header">📊 View Records</p>
        <h1 className="sub-header">BPPIMT Attendance History Logs</h1>
      </div>

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
    </div>
  );
}

export default ViewRecords;
