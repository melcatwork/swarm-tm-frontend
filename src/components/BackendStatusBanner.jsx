/**
 * Backend Status Banner Component
 *
 * Displays a banner at the top of the page when the backend is unreachable.
 * Periodically checks backend health and shows/hides the banner accordingly.
 */

import { useState, useEffect } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { checkHealth } from '../api/client';
import './BackendStatusBanner.css';

function BackendStatusBanner() {
  const [isBackendDown, setIsBackendDown] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const checkBackendHealth = async () => {
    try {
      await checkHealth();
      setIsBackendDown(false);
    } catch (error) {
      console.error('Backend health check failed:', error);
      setIsBackendDown(true);
    }
  };

  const handleRetry = async () => {
    setIsChecking(true);
    await checkBackendHealth();
    setIsChecking(false);
  };

  useEffect(() => {
    // Initial health check
    checkBackendHealth();

    // Check every 30 seconds
    const interval = setInterval(checkBackendHealth, 30000);

    return () => clearInterval(interval);
  }, []);

  if (!isBackendDown) {
    return null;
  }

  return (
    <div className="backend-status-banner">
      <div className="banner-content">
        <AlertCircle size={20} />
        <div className="banner-message">
          <strong>Backend Unreachable</strong>
          <span>
            Cannot connect to Swarm TM API. Please ensure the backend is running at {import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}
          </span>
        </div>
        <button
          className="banner-retry-btn"
          onClick={handleRetry}
          disabled={isChecking}
        >
          {isChecking ? (
            <>
              <RefreshCw size={16} className="spinning" />
              Checking...
            </>
          ) : (
            <>
              <RefreshCw size={16} />
              Retry
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default BackendStatusBanner;
