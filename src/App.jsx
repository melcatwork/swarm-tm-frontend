import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import BackendStatusBanner from './components/BackendStatusBanner';
import Layout from './components/Layout';
import ThreatIntelPage from './pages/ThreatIntelPage';
import ThreatModelPage from './pages/ThreatModelPage';
import './App.css';

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <BackendStatusBanner />
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/intel" replace />} />
            <Route path="/intel" element={<ThreatIntelPage />} />
            <Route path="/model" element={<ThreatModelPage />} />
          </Routes>
        </Layout>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
