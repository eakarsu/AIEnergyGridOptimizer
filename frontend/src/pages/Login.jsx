import React, { useState } from 'react';

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Login failed');
      }
      onLogin(data.token, data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    setEmail('admin@energygrid.com');
    setPassword('admin123');
    setTimeout(() => {
      document.getElementById('login-form').requestSubmit();
    }, 100);
  };

  return (
    <div className="login-page">
      <div className="login-bg-effects">
        <div className="login-bg-orb orb-1"></div>
        <div className="login-bg-orb orb-2"></div>
        <div className="login-bg-orb orb-3"></div>
      </div>
      <div className="login-card">
        <div className="login-header">
          <div className="login-icon">
            <i className="fas fa-bolt"></i>
          </div>
          <h1 className="login-title">AI Energy Grid Optimizer</h1>
          <p className="login-subtitle">Intelligent Power Grid Management</p>
        </div>

        {error && (
          <div className="login-error">
            <i className="fas fa-exclamation-circle"></i>
            <span>{error}</span>
          </div>
        )}

        <form id="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">
              <i className="fas fa-envelope"></i> Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">
              <i className="fas fa-lock"></i> Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary login-btn" disabled={loading}>
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i> Signing in...
              </>
            ) : (
              <>
                <i className="fas fa-sign-in-alt"></i> Sign In
              </>
            )}
          </button>
        </form>

        <div className="login-divider">
          <span>or</span>
        </div>

        <button className="btn btn-demo" onClick={handleDemoLogin}>
          <i className="fas fa-play-circle"></i> Demo Login
        </button>

        <div className="login-footer">
          <p>Powered by AI &middot; Real-time Grid Analytics</p>
        </div>
      </div>
    </div>
  );
}

export default Login;
