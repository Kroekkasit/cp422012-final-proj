import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PatternBackground from '../components/PatternBackground';
import { apiPost } from '../api';

export default function CreateClass() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    subject_name: '',
    subject_id: '',
    section: '',
    max_students: '',
    room: '',
  });

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const subjectName = form.subject_name.trim();
    if (!subjectName) {
      setError('Subject name is required.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await apiPost('/api/classrooms', {
        subject_name: subjectName,
        subject_id: form.subject_id.trim() || undefined,
        section: form.section.trim() || undefined,
        max_students: form.max_students.trim() ? parseInt(form.max_students, 10) : undefined,
        room: form.room.trim() || undefined,
      });
      navigate('/dashboard/classes');
    } catch (err) {
      setError(err.message || 'Failed to create class');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pattern-page create-class-page">
      <PatternBackground />
      <div className="pattern-page-content create-class-content">
        <div className="classes-card create-class-card">
          <header className="create-class-header">
            <Link to="/dashboard/classes" className="btn-back" aria-label="Back to classes">
              ← Back
            </Link>
            <h1>Create a class</h1>
            <p>Fill in the details below. Only subject name is required.</p>
          </header>

          {error && <div className="dashboard-error">{error}</div>}

          <form onSubmit={handleSubmit} className="create-class-form">
            <div className="create-class-grid">
              <div className="form-group form-group-wide">
                <label htmlFor="subject_name">Subject name</label>
                <input
                  id="subject_name"
                  type="text"
                  value={form.subject_name}
                  onChange={(e) => update('subject_name', e.target.value)}
                  placeholder="e.g. Introduction to Programming"
                  required
                  autoFocus
                />
                <span className="field-hint">The course or subject title.</span>
              </div>

              <div className="form-group">
                <label htmlFor="subject_id">Subject ID</label>
                <input
                  id="subject_id"
                  type="text"
                  value={form.subject_id}
                  onChange={(e) => update('subject_id', e.target.value)}
                  placeholder="e.g. CS101"
                />
                <span className="field-hint">Course code.</span>
              </div>

              <div className="form-group">
                <label htmlFor="section">Section</label>
                <input
                  id="section"
                  type="text"
                  value={form.section}
                  onChange={(e) => update('section', e.target.value)}
                  placeholder="e.g. A, 01, Morning"
                />
                <span className="field-hint">Section or group.</span>
              </div>

              <div className="form-group">
                <label htmlFor="max_students">Max students</label>
                <input
                  id="max_students"
                  type="number"
                  min="1"
                  max="9999"
                  value={form.max_students}
                  onChange={(e) => update('max_students', e.target.value)}
                  placeholder="Optional"
                />
                <span className="field-hint">Leave blank if unlimited.</span>
              </div>

              <div className="form-group form-group-wide">
                <label htmlFor="room">Room / location</label>
                <input
                  id="room"
                  type="text"
                  value={form.room}
                  onChange={(e) => update('room', e.target.value)}
                  placeholder="e.g. Building A, Room 302"
                />
              </div>
            </div>

            <div className="create-class-actions">
              <Link to="/dashboard/classes" className="btn btn-cancel">
                Cancel
              </Link>
              <button type="submit" className="btn btn-submit-create" disabled={submitting}>
                {submitting ? 'Creating…' : 'Create class'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
