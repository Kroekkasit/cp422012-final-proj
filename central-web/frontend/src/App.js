import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import SessionHistory from './pages/SessionHistory';
import Classes from './pages/Classes';
import CreateClass from './pages/CreateClass';
import './App.css';

function AppHeader() {
  const { user, logout } = useAuth();

  return (
    <header className="app-header">
      <Link to="/" className="app-logo">
        AttendX
      </Link>
      <nav className="app-nav">
        {user ? (
          <>
            <Link to="/dashboard" className="btn btn-outline">
              Dashboard
            </Link>
            <Link to="/dashboard/classes" className="btn btn-outline">
              Classes
            </Link>
            <button type="button" className="btn btn-outline" onClick={logout}>
              Sign out
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn btn-outline">
              Sign in
            </Link>
            <Link to="/register" className="btn btn-primary">
              Create account
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="app">
          <AppHeader />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/sessions"
              element={
                <ProtectedRoute>
                  <SessionHistory />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/classes"
              element={
                <ProtectedRoute>
                  <Classes />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/classes/create"
              element={
                <ProtectedRoute>
                  <CreateClass />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
