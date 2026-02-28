import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PatternBackground from '../components/PatternBackground';
import { apiGet, apiPost } from '../api';

const CARD_ACCENTS = [
  'var(--orange-400)',
  'var(--orange-500)',
  'var(--orange-600)',
  '#ea580c',
  '#c2410c',
];

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString(undefined, { dateStyle: 'medium' });
}

export default function Classes() {
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [startingId, setStartingId] = useState(null);
  const navigate = useNavigate();

  const fetchClasses = async () => {
    try {
      setError('');
      const data = await apiGet('/api/classrooms');
      setClassrooms(data.classrooms || []);
    } catch (e) {
      setError(e.message || 'Failed to load classes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const handleStartSession = async (classroomId) => {
    setStartingId(classroomId);
    setError('');
    try {
      await apiPost('/api/sessions', { classroom_id: classroomId });
      navigate('/dashboard');
    } catch (e) {
      setError(e.message || 'Failed to start session');
      setStartingId(null);
    }
  };

  return (
    <div className="pattern-page classes-page">
      <PatternBackground />
      <div className="pattern-page-content classes-content">
        <div className="classes-card">
          <header className="classes-header">
            <div className="classes-header-text">
              <h1>Classes</h1>
              <p>Your classrooms. Start a session from here or from the dashboard.</p>
            </div>
            <Link to="/dashboard/classes/create" className="btn btn-new-class">
              + New class
            </Link>
          </header>

          {error && <div className="dashboard-error">{error}</div>}

          {loading ? (
            <div className="dashboard-loading">
              <div className="spinner" />
              <p>Loading classes…</p>
            </div>
          ) : classrooms.length === 0 ? (
            <div className="classes-empty">
              <div className="classes-empty-icon">📚</div>
              <h2>No classes yet</h2>
              <p>Create your first classroom to start taking attendance with AttendX.</p>
              <Link to="/dashboard/classes/create" className="btn btn-primary btn-empty-cta">
                Create your first class
              </Link>
            </div>
          ) : (
            <ul className="classes-grid">
              {classrooms.map((c, i) => (
                <li key={c.id} className="class-card" style={{ '--accent': CARD_ACCENTS[i % CARD_ACCENTS.length] }}>
                  <div className="class-card-accent" />
                  <div className="class-card-body">
                    <span className="class-card-id">ID {c.id}</span>
                    <h3 className="class-card-name">{c.name}</h3>
                    <span className="class-card-date">Added {formatDate(c.created_at)}</span>
                    <div className="class-card-actions">
                      <button
                        type="button"
                        className="btn btn-card-primary"
                        onClick={() => handleStartSession(c.id)}
                        disabled={!!startingId}
                        title="Start an attendance session for this class"
                      >
                        {startingId === c.id ? 'Starting…' : 'Start session'}
                      </button>
                      <Link to="/dashboard" className="btn btn-card-ghost">
                        Dashboard →
                      </Link>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
