import React from 'react';
import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div className="main-content">
      <div className="landing-hero">
        <h1 className="brand">AttendX</h1>
        <p className="tagline">
          Check classroom attendance with Wi‑Fi. Teachers run the app, students connect and tap to check in.
        </p>
        <div className="landing-actions">
          <Link to="/login" className="btn btn-primary">
            Sign in
          </Link>
          <Link to="/register" className="btn btn-outline">
            Create account
          </Link>
        </div>
      </div>
    </div>
  );
}
