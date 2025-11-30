import { useState, useEffect } from 'react';
import NarrativeLab from './components/NarrativeLab.jsx';
import LiveOverrides from './components/LiveOverrides.jsx';
import ExportPanel from './components/ExportPanel.jsx';
import CommunityHub from './components/CommunityHub.jsx';

const { invoke } = window.__TAURI__;

function App() {
  const [activeTab, setActiveTab] = useState('narrative');
  const [gatewayStatus, setGatewayStatus] = useState({ running: false });
  const [licenseInfo, setLicenseInfo] = useState(null);
  const [appInfo, setAppInfo] = useState(null);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  async function checkStatus() {
    try {
      const status = await invoke('check_gateway_status');
      setGatewayStatus(status);
      
      if (status.running) {
        const license = await invoke('get_license_info');
        setLicenseInfo(license);
      }
      
      const info = await invoke('get_app_info');
      setAppInfo(info);
    } catch (error) {
      console.error('Status check failed:', error);
    }
  }

  const navItems = [
    { id: 'narrative', label: 'Narrative Lab', icon: '📖' },
    { id: 'overrides', label: 'Live Overrides', icon: '⚡' },
    { id: 'export', label: 'Export Center', icon: '📦' },
    { id: 'community', label: 'Community Hub', icon: '🌐' },
  ];

  function renderContent() {
    switch (activeTab) {
      case 'narrative':
        return <NarrativeLab />;
      case 'overrides':
        return <LiveOverrides />;
      case 'export':
        return <ExportPanel />;
      case 'community':
        return <CommunityHub />;
      default:
        return <NarrativeLab />;
    }
  }

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo">PacAI</div>
          <div className="version">v5.0.0 — Enterprise</div>
        </div>
        
        <nav className="nav-items">
          {navItems.map(item => (
            <div
              key={item.id}
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </nav>
        
        <div style={{ padding: '12px', borderTop: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '8px' }}>
            License Status
          </div>
          {licenseInfo ? (
            <div className="license-badge">
              ✓ {licenseInfo.tier.toUpperCase()}
            </div>
          ) : (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Checking license...
            </div>
          )}
        </div>
      </aside>
      
      <main className="main-content">
        <header className="header">
          <div className="status-indicator">
            <div className={`status-dot ${gatewayStatus.running ? '' : 'offline'}`}></div>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Gateway: {gatewayStatus.running ? 'Connected' : 'Offline'}
            </span>
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-secondary" onClick={checkStatus}>
              Refresh
            </button>
          </div>
        </header>
        
        <div className="content-area">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

export default App;
