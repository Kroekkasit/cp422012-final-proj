import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PatternBackground from '../components/PatternBackground';
import { apiGet, apiPost } from '../api';

const MOTTOS = [
  'Every check-in counts. Start when you’re ready.',
  'One tap to take attendance. Simple as that.',
  'Your class, your pace. Start a session anytime.',
];

export default function Dashboard() {
  const { user } = useAuth();
  const [ongoing, setOngoing] = useState(null);
  const [recentSessions, setRecentSessions] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [startModalOpen, setStartModalOpen] = useState(false);
  const [startingForClassroom, setStartingForClassroom] = useState(null);
  const [newClassroomName, setNewClassroomName] = useState('');
  const [creatingClassroom, setCreatingClassroom] = useState(false);
  const motto = MOTTOS[Math.floor(Math.random() * MOTTOS.length)];

  const fetchDashboard = useCallback(async () => {
    try {
      setError('');
      const [ongoingRes, recentRes, classroomsRes] = await Promise.all([
        apiGet('/api/sessions/ongoing'),
        apiGet('/api/sessions/recent?limit=5'),
        apiGet('/api/classrooms'),
      ]);
      setOngoing(ongoingRes.session);
      setRecentSessions(recentRes.sessions || []);
      setClassrooms(classroomsRes.classrooms || []);
    } catch (e) {
      setError(e.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    if (!ongoing) return;
    const t = setInterval(fetchDashboard, 5000);
    return () => clearInterval(t);
  }, [ongoing, fetchDashboard]);

  const handleStartSession = async (classroomId) => {
    setStartingForClassroom(classroomId);
    setError('');
    try {
      await apiPost('/api/sessions', { classroom_id: classroomId });
      setStartModalOpen(false);
      await fetchDashboard();
    } catch (e) {
      setError(e.message || 'Failed to start session');
    } finally {
      setStartingForClassroom(null);
    }
  };

  const handleEndSession = async () => {
    if (!ongoing) return;
    setError('');
    try {
      await apiPost(`/api/sessions/${ongoing.id}/end`);
      await fetchDashboard();
    } catch (e) {
      setError(e.message || 'Failed to end session');
    }
  };

  const handleCreateClassroom = async (e) => {
    e.preventDefault();
    const name = newClassroomName.trim();
    if (!name) return;
    setCreatingClassroom(true);
    setError('');
    try {
      await apiPost('/api/classrooms', { name });
      setNewClassroomName('');
      await fetchDashboard();
    } catch (e) {
      setError(e.message || 'Failed to create classroom');
    } finally {
      setCreatingClassroom(false);
    }
  };

  if (loading) {
    return (
      <div className="pattern-page dashboard-page">
        <PatternBackground />
        <div className="pattern-page-content dashboard-content">
          <div className="dashboard-loading">
            <div className="spinner" />
            <p>Loading dashboard…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pattern-page dashboard-page">
      <PatternBackground />
      <div className="pattern-page-content dashboard-content">
        <h1 className="dashboard-title">Hi, {user?.username}</h1>
        {error && <div className="dashboard-error">{error}</div>}

        {/* Ongoing session monitoring panel */}
        {ongoing ? (
          <section className="dashboard-panel ongoing-panel">
            <h2>Ongoing attendance check</h2>
            <div className="ongoing-code">
              <span className="ongoing-code-label">Session code</span>
              <span className="ongoing-code-value">{ongoing.code}</span>
              <p className="ongoing-hint">Students enter this code on the host device to join.</p>
            </div>
            <div className="ongoing-classroom">{ongoing.classroom_name}</div>
            <div className="ongoing-stats">
              <span className="ongoing-stat">
                <strong>{ongoing.checked_count}</strong> / <strong>{ongoing.total_students}</strong> checked in
              </span>
            </div>
            <button type="button" className="btn btn-end-session" onClick={handleEndSession}>
              End session
            </button>
          </section>
        ) : (
          <section className="dashboard-panel start-panel">
            <p className="dashboard-motto">{motto}</p>
            <button
              type="button"
              className="btn btn-start-session"
              onClick={() => setStartModalOpen(true)}
            >
              Start session
            </button>
          </section>
        )}

        {/* Recent sessions list */}
        <section className="dashboard-panel recent-panel">
          <div className="recent-panel-header">
            <h2>Recent sessions</h2>
            <Link to="/dashboard/sessions" className="btn btn-link">View session history</Link>
          </div>
          {recentSessions.length === 0 ? (
            <p className="recent-empty">No sessions yet. Start one when you’re ready.</p>
          ) : (
            <ul className="recent-list">
              {recentSessions.map((s) => (
                <li key={s.id} className="recent-item">
                  <div className="recent-item-main">
                    <span className="recent-classroom-name">{s.classroom_name}</span>
                    <span className="recent-meta">
                      ID {s.classroom_id} · {s.checked_count}/{s.total_students} checked
                      {s.ended_at ? ' · Ended' : ' · Ongoing'}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-start-inline"
                    onClick={() => handleStartSession(s.classroom_id)}
                    disabled={!!ongoing || startingForClassroom === s.classroom_id}
                  >
                    {startingForClassroom === s.classroom_id ? 'Starting…' : 'Start new session'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Start session modal */}
        {startModalOpen && (
          <div className="modal-overlay" onClick={() => setStartModalOpen(false)}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <h3>Start attendance session</h3>
              {classrooms.length === 0 ? (
                <>
                  <p className="modal-hint">Create a classroom first.</p>
                  <form onSubmit={handleCreateClassroom} className="modal-form">
                    <input
                      type="text"
                      value={newClassroomName}
                      onChange={(e) => setNewClassroomName(e.target.value)}
                      placeholder="Classroom name"
                      autoFocus
                    />
                    <button type="submit" className="btn btn-primary" disabled={creatingClassroom}>
                      {creatingClassroom ? 'Creating…' : 'Create classroom'}
                    </button>
                  </form>
                </>
              ) : (
                <ul className="modal-classroom-list">
                  {classrooms.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        className="btn btn-classroom"
                        onClick={() => handleStartSession(c.id)}
                        disabled={!!startingForClassroom}
                      >
                        {c.name} <span className="classroom-id">(ID {c.id})</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setStartModalOpen(false)}>
                  Cancel
                </button>
                {classrooms.length > 0 && (
                  <form onSubmit={handleCreateClassroom} className="modal-form-inline">
                    <input
                      type="text"
                      value={newClassroomName}
                      onChange={(e) => setNewClassroomName(e.target.value)}
                      placeholder="New classroom name"
                    />
                    <button type="submit" className="btn btn-outline" disabled={creatingClassroom}>
                      Add classroom
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
