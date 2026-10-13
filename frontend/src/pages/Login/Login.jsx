import React, { useState } from 'react';
import { getApiUrl } from '../../services/apiClient';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import loginImage from '../../assets/login page image.webp';
import cityRideLogo from '../../assets/city ride logo.webp';
import './Login.css';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSetupMode, setIsSetupMode] = useState(location.pathname === '/register');
  const [formData, setFormData] = useState({ email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Sync mode with URL if user navigates back/forward
  React.useEffect(() => {
    setIsSetupMode(location.pathname === '/register');
  }, [location.pathname]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (isSetupMode && formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const endpoint = isSetupMode
        ? `${getApiUrl()}/auth/owner-setup`
        : `${getApiUrl()}/auth/admin-login`;

      const payload = isSetupMode
        ? { owner_code: formData.email, password: formData.password }
        : { email: formData.email, password: formData.password };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Action failed');
      }

      if (isSetupMode) {
        setFormData({ ...formData, password: '', confirmPassword: '' });
        setError('');
        navigate('/login');
        return; // after setup just switch to login mode
      }

      const { role } = data.data.user;

      if (role === 'OWNER') {
        localStorage.setItem('ownerToken', data.data.token);
        localStorage.setItem('ownerUser', JSON.stringify(data.data.user));
        navigate('/owner');
      } else {
        localStorage.setItem('adminToken', data.data.token);
        localStorage.setItem('adminUser', JSON.stringify(data.data.user));
        navigate('/dashboard');
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="login-container animate-fade-in"
      style={{
        backgroundImage: `url("${loginImage}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        width: '100%',
        minHeight: '100vh',
        padding: 0
      }}
    >
      <div
        className="login-card"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          margin: 'auto'
        }}
      >
        <div className="login-header">
          <div className="login-logo">
            <img src={cityRideLogo} alt="City Ride Logo" style={{ maxWidth: '180px', maxHeight: '60px', objectFit: 'contain' }} />
          </div>
          <h2>{isSetupMode ? 'Create Owner' : 'Login'}</h2>
          <p>{isSetupMode ? 'Set up a new owner account' : 'Sign in to manage the platform'}</p>
        </div>

        {error && <div className="error-message" style={{ color: 'var(--danger)', marginBottom: '1rem', textAlign: 'center', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '0.5rem', borderRadius: '8px' }}>{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <label htmlFor="email">{isSetupMode ? 'Owner ID' : 'Email Address / Owner ID'}</label>
            <input
              type="text"
              id="email"
              className="input-control"
              placeholder={isSetupMode ? "owner001" : "Enter Your UserName"}
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className="input-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              className="input-control"
              placeholder="••••••••"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>

          {isSetupMode && (
            <>
              <div className="input-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input
                  type="password"
                  id="confirmPassword"
                  className="input-control"
                  placeholder="••••••••"
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                />
              </div>
            </>
          )}

          <button type="submit" className="btn btn-primary login-btn" disabled={loading}>
            <LogIn size={20} />
            <span>{loading ? 'Processing...' : (isSetupMode ? 'Create Owner' : 'Sign In')}</span>
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline' }}
            onClick={() => {
              navigate(isSetupMode ? '/login' : '/register');
              setError('');
            }}
          >
            {isSetupMode ? 'Back to Login' : 'Create Owner ID & Password'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
