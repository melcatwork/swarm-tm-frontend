import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Shield, Target, Circle } from 'lucide-react';
import { checkHealth } from '../api/client';
import './Layout.css';

function Layout({ children }) {
  const [apiStatus, setApiStatus] = useState('connecting');
  const location = useLocation();

  useEffect(() => {
    // Check health on mount
    checkApiHealth();

    // Set up interval to check health every 30 seconds
    const interval = setInterval(checkApiHealth, 30000);

    return () => clearInterval(interval);
  }, []);

  const checkApiHealth = async () => {
    try {
      await checkHealth();
      setApiStatus('connected');
    } catch (error) {
      console.error('Health check failed:', error);
      setApiStatus('disconnected');
    }
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <div className="layout">
      <header className="header">
        <div className="header-left">
          <h1 className="app-title">Swarm TM</h1>
        </div>
        <div className="header-right">
          <div className={`status-indicator ${apiStatus}`}>
            <Circle
              size={10}
              className="status-dot"
              fill={apiStatus === 'connected' ? '#22c55e' : '#ef4444'}
            />
            <span className="status-text">
              API {apiStatus === 'connected' ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </header>

      <div className="main-container">
        <aside className="sidebar">
          <nav className="nav">
            <Link
              to="/intel"
              className={`nav-item ${isActive('/intel') ? 'active' : ''}`}
            >
              <Shield size={20} />
              <span>Threat Intel</span>
            </Link>
            <Link
              to="/model"
              className={`nav-item ${isActive('/model') ? 'active' : ''}`}
            >
              <Target size={20} />
              <span>Threat Model</span>
            </Link>
          </nav>
        </aside>

        <main className="content">
          {children}
        </main>
      </div>
    </div>
  );
}

export default Layout;
