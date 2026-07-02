import React, { useState, useEffect } from 'react';
import { Settings, Trash2, ShieldAlert, CheckCircle2, UserMinus, Loader2 } from 'lucide-react';

function ManageEmbeddings() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({
    message: '',
    type: '' // success, error
  });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:5000/api/users');
      const data = await res.json();
      setUsers(data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching users:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDeleteUser = async (userId, userName) => {
    const confirm = window.confirm(`Are you sure you want to delete ${userName} (${userId})? This will permanently delete their student record and trained face descriptors.`);
    if (!confirm) return;

    try {
      const res = await fetch(`http://localhost:5000/api/users/${userId}`, {
        method: 'DELETE'
      });
      const data = await res.json();

      if (res.ok) {
        setStatus({ message: `Successfully deleted student ${userName}.`, type: 'success' });
        // Refresh list
        setUsers(prev => prev.filter(u => u.id !== userId));
      } else {
        throw new Error(data.error || 'Failed to delete user');
      }
    } catch (err) {
      setStatus({ message: err.message, type: 'error' });
    }
  };

  const handleClearAllEmbeddings = async () => {
    const confirm = window.confirm('WARNING: Are you sure you want to delete ALL face embeddings from the system database? Students will not be recognized until their datasets are re-trained.');
    if (!confirm) return;

    try {
      const res = await fetch('http://localhost:5000/api/embeddings', {
        method: 'DELETE'
      });
      const data = await res.json();

      if (res.ok) {
        setStatus({ message: 'All face descriptors cleared from system.', type: 'success' });
      } else {
        throw new Error(data.error || 'Failed to clear database');
      }
    } catch (err) {
      setStatus({ message: err.message, type: 'error' });
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="institute-header">
        <p className="main-header">⚙️ System Management</p>
        <h1 className="sub-header">Manage Registered Students and Trained Data</h1>
      </div>

      <div className="grid-3" style={{ gridTemplateColumns: '2fr 1fr' }}>
        {/* User Database management */}
        <div className="glass-card">
          <h3 style={{ marginBottom: '1.5rem', color: '#a78bfa', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>Registered Student Directory</span>
          </h3>

          {status.message && (
            <div className={`alert ${status.type === 'success' ? 'alert-success' : 'alert-danger'}`}>
              {status.type === 'success' ? <CheckCircle2 size={18} /> : <ShieldAlert size={18} />}
              <span>{status.message}</span>
            </div>
          )}

          {loading ? (
            <div className="flex-center" style={{ padding: '4rem', flexDirection: 'column' }}>
              <Loader2 className="animate-spin" size={32} color="var(--primary)" style={{ marginBottom: '1rem' }} />
              <p style={{ color: 'var(--text-muted)' }}>Loading student records...</p>
            </div>
          ) : users.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
              <UserMinus size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
              <h3>Directory Empty</h3>
              <p style={{ fontSize: '0.9rem' }}>No student details have been registered yet.</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>University ID</th>
                    <th>Name</th>
                    <th>Registered At</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td style={{ fontWeight: 600 }}>{user.id.includes('_') ? user.id.split('_')[0] : user.id}</td>
                      <td>{user.name}</td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button 
                          onClick={() => handleDeleteUser(user.id, user.name)} 
                          className="btn btn-danger btn-secondary" 
                          style={{ padding: '0.4rem 0.8rem', minHeight: 0, borderRadius: '8px' }}
                          title="Delete user and embeddings"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Database Control Center */}
        <div className="glass-card" style={{ height: 'fit-content' }}>
          <h3 style={{ marginBottom: '1rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldAlert size={20} />
            <span>Danger Zone</span>
          </h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: '1.6' }}>
            Destructive administration tools. These operations cannot be undone. Please proceed with caution.
          </p>

          <button 
            onClick={handleClearAllEmbeddings} 
            className="btn btn-danger"
            style={{ width: '100%', padding: '0.8rem' }}
          >
            <Trash2 size={16} />
            <span>Clear Embeddings DB</span>
          </button>
          
          <div style={{ marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <p><strong>Note:</strong> Clearing the embeddings database deletes only the computed facial descriptors from memory. Original face capture folders on disk will remain untouched.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ManageEmbeddings;
