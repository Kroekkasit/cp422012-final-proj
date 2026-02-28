import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PatternBackground from '../components/PatternBackground';
import { apiGet } from '../api';

function formatDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleString(undefined, {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

export default function SessionHistory() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiGet('/api/sessions/history?limit=50')
      .then((data) => setSessions(data.sessions || []))
      .catch((e) => setError(e.message || 'Failed to load history'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="pattern-page session-history-page">
      <PatternBackground />
      <div className="pattern-page-content session-history-content">
        <div className="session-history-card">
          <div className="session-history-header">
            <h1>Session history</h1>
            <Link to="/dashboard" className="btn btn-outline">Back to dashboard</Link>
          </div>
          {error && <div className="dashboard-error">{error}</div>}
          {loading ? (
            <div className="dashboard-loading">
              <div className="spinner" />
              <p>Loading sessions…</p>
            </div>
          ) : sessions.length === 0 ? (
            <p className="recent-empty">No sessions in history.</p>
          ) : (
            <div className="session-table-wrap">
              <table className="session-table">
                <thead>
                  <tr>
                    <th>Classroom</th>
                    <th>ID</th>
                    <th>Code</th>
                    <th>Checked</th>
                    <th>Started</th>
                    <th>Ended</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s) => (
                    <tr key={s.id}>
                      <td>{s.classroom_name}</td>
                      <td>{s.classroom_id}</td>
                      <td><code className="session-code">{s.code}</code></td>
                      <td>{s.checked_count} / {s.total_students}</td>
                      <td>{formatDate(s.started_at)}</td>
                      <td>{s.ended_at ? formatDate(s.ended_at) : 'Ongoing'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
