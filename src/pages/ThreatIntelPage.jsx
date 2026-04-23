import { useState, useEffect } from 'react';
import { RefreshCw, Download } from 'lucide-react';
import ThreatFeedCard from '../components/ThreatFeedCard';
import Toast from '../components/Toast';
import SourceManager from '../components/SourceManager';
import { getIntelItems, pullLatestIntel, updateTTPLibrary } from '../api/client';
import './ThreatIntelPage.css';

function ThreatIntelPage() {
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pulling, setPulling] = useState(false);
  const [updatingTTP, setUpdatingTTP] = useState(false);
  const [toast, setToast] = useState(null);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchItems();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [items, categoryFilter, severityFilter, searchQuery]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getIntelItems({ limit: 100 });
      setItems(data);
    } catch (err) {
      console.error('Failed to fetch items:', err);
      setError('Failed to load threat intelligence. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...items];

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(item => item.category === categoryFilter);
    }

    // Severity filter
    if (severityFilter !== 'all') {
      filtered = filtered.filter(item => item.severity === severityFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(query) ||
        item.summary.toLowerCase().includes(query)
      );
    }

    setFilteredItems(filtered);
  };

  const handlePullLatest = async () => {
    try {
      setPulling(true);
      const result = await pullLatestIntel();
      setToast({
        message: `Successfully fetched ${result.items_fetched} items`,
        type: 'success'
      });
      // Refresh the list
      await fetchItems();
    } catch (err) {
      console.error('Failed to pull latest:', err);
      setToast({
        message: 'Failed to pull latest intel',
        type: 'error'
      });
    } finally {
      setPulling(false);
    }
  };

  const handleUpdateTTP = async () => {
    try {
      setUpdatingTTP(true);
      const result = await updateTTPLibrary();
      setToast({
        message: `Updated ${result.techniques_updated} ATT&CK techniques`,
        type: 'success'
      });
      // Refresh the list
      await fetchItems();
    } catch (err) {
      console.error('Failed to update TTP:', err);
      setToast({
        message: 'Failed to update TTP library',
        type: 'error'
      });
    } finally {
      setUpdatingTTP(false);
    }
  };

  return (
    <div className="threat-intel-page">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="page-header">
        <div>
          <h2>Threat Intelligence Dashboard</h2>
          <p className="page-subtitle">
            Real-time threat intelligence from multiple sources
          </p>
        </div>
        <div className="action-buttons">
          <button
            className="btn btn-secondary"
            onClick={handlePullLatest}
            disabled={pulling || loading}
          >
            {pulling ? (
              <>
                <RefreshCw size={16} className="spinning" />
                Pulling...
              </>
            ) : (
              <>
                <RefreshCw size={16} />
                Pull Latest Intel
              </>
            )}
          </button>
          <button
            className="btn btn-primary"
            onClick={handleUpdateTTP}
            disabled={updatingTTP || loading}
          >
            {updatingTTP ? (
              <>
                <Download size={16} className="spinning" />
                Updating...
              </>
            ) : (
              <>
                <Download size={16} />
                Update TTP Library
              </>
            )}
          </button>
        </div>
      </div>

      <div className="filter-bar">
        <div className="filter-group">
          <label htmlFor="category-filter">Category:</label>
          <select
            id="category-filter"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            disabled={loading}
          >
            <option value="all">All</option>
            <option value="cve">CVE</option>
            <option value="incident">Incident</option>
            <option value="ttp">TTP</option>
            <option value="news">News</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="severity-filter">Severity:</label>
          <select
            id="severity-filter"
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            disabled={loading}
          >
            <option value="all">All</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
            <option value="info">Info</option>
          </select>
        </div>

        <div className="filter-group filter-search">
          <input
            type="text"
            placeholder="Search by title or summary..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="item-count">
          Showing <strong>{filteredItems.length}</strong> of{' '}
          <strong>{items.length}</strong> items
        </div>
      </div>

      <div className="feed-container">
        {loading && (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading threat intelligence...</p>
          </div>
        )}

        {error && !loading && (
          <div className="error-state">
            <p>{error}</p>
            <button className="btn btn-primary" onClick={fetchItems}>
              Retry
            </button>
          </div>
        )}

        {!loading && !error && filteredItems.length === 0 && (
          <div className="empty-state">
            <p>No threat intelligence items found matching your filters.</p>
          </div>
        )}

        {!loading && !error && filteredItems.length > 0 && (
          <div className="feed-list">
            {filteredItems.map((item) => (
              <ThreatFeedCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>

      {/* News Score Definition */}
      <div className="score-definition-section">
        <h3>News Score Definition</h3>
        <p className="score-formula">
          Score (0-10) = Normalized[(Base × Severity × Recency) + Cross-Source Bonus]
        </p>
        <ul className="score-details">
          <li><strong>Severity:</strong> Critical=5×, High=3×, Medium=1.5×, Low=0.5×, Info=0.2×</li>
          <li><strong>Recency:</strong> Today=3×, Yesterday=2×, This Week=1×, Older=0.5×</li>
          <li><strong>Cross-Source:</strong> +2.0 per additional source citing same CVE/topic</li>
        </ul>
      </div>

      <SourceManager />
    </div>
  );
}

export default ThreatIntelPage;
