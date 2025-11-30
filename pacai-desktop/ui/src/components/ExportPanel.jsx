import { useState } from 'react';

const { invoke } = window.__TAURI__ || {};

function ExportPanel() {
  const [projectId, setProjectId] = useState('');
  const [selectedEngines, setSelectedEngines] = useState([]);
  const [quality, setQuality] = useState('high');
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState(null);

  const engines = [
    { id: 'ue5', name: 'Unreal Engine 5', icon: '🎮', size: '~50MB' },
    { id: 'unity', name: 'Unity', icon: '🔷', size: '~40MB' },
    { id: 'godot', name: 'Godot', icon: '🤖', size: '~15MB' },
    { id: 'roblox', name: 'Roblox', icon: '🧱', size: '~8MB' },
    { id: 'blender', name: 'Blender', icon: '🎨', size: '~100MB' },
    { id: 'cryengine', name: 'CryEngine', icon: '❄️', size: '~75MB' },
    { id: 'source2', name: 'Source 2', icon: '🎯', size: '~60MB' },
    { id: 'webgpu', name: 'WebGPU', icon: '🌐', size: '~5MB' },
    { id: 'visionos', name: 'visionOS', icon: '👓', size: '~30MB' },
  ];

  function toggleEngine(engineId) {
    setSelectedEngines(prev =>
      prev.includes(engineId)
        ? prev.filter(id => id !== engineId)
        : [...prev, engineId]
    );
  }

  async function handleExport() {
    if (!projectId.trim() || selectedEngines.length === 0) return;
    
    setExporting(true);
    
    try {
      const response = await invoke('export_bundle', {
        request: {
          project_id: projectId.trim(),
          engines: selectedEngines,
          quality: quality,
        }
      });
      setExportResult(response);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
    }
  }

  function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  return (
    <div>
      <div className="panel">
        <h2 className="panel-title">Multi-Engine Export Center</h2>
        
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Project ID
          </label>
          <input
            className="input"
            placeholder="Enter project UUID to export"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          />
        </div>
        
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Select Engines ({selectedEngines.length} selected)
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {engines.map(engine => (
              <div
                key={engine.id}
                onClick={() => toggleEngine(engine.id)}
                style={{
                  padding: '12px',
                  background: selectedEngines.includes(engine.id) ? 'var(--accent-blue)' : 'var(--bg-tertiary)',
                  border: `1px solid ${selectedEngines.includes(engine.id) ? 'var(--accent-blue)' : 'var(--border-color)'}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.25rem' }}>{engine.icon}</span>
                  <div>
                    <div style={{ fontWeight: '500', fontSize: '0.9rem' }}>{engine.name}</div>
                    <div style={{ fontSize: '0.7rem', color: selectedEngines.includes(engine.id) ? 'rgba(255,255,255,0.7)' : 'var(--text-tertiary)' }}>
                      {engine.size}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Export Quality
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {['low', 'medium', 'high'].map(q => (
              <button
                key={q}
                className={`btn ${quality === q ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setQuality(q)}
                style={{ flex: 1, textTransform: 'capitalize' }}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
        
        <button
          className="btn btn-primary"
          onClick={handleExport}
          disabled={exporting || !projectId.trim() || selectedEngines.length === 0}
          style={{ opacity: exporting ? 0.7 : 1, width: '100%' }}
        >
          {exporting ? 'Exporting...' : `Export to ${selectedEngines.length} Engine${selectedEngines.length !== 1 ? 's' : ''}`}
        </button>
      </div>
      
      {exportResult && (
        <div className="panel">
          <h2 className="panel-title">Export Complete</h2>
          
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Total Size</span>
              <span style={{ fontWeight: '600' }}>{formatBytes(exportResult.total_size_bytes)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Status</span>
              <span style={{ color: 'var(--accent-green)', fontWeight: '600' }}>{exportResult.status?.toUpperCase()}</span>
            </div>
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Engine Bundles
            </h4>
            {exportResult.engines?.map((eng, idx) => (
              <div
                key={idx}
                style={{
                  padding: '12px',
                  background: 'var(--bg-tertiary)',
                  borderRadius: '8px',
                  marginBottom: '8px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontWeight: '500' }}>{eng.engine}</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {formatBytes(eng.size_bytes)}
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                  {eng.files?.length || 0} files
                </div>
              </div>
            ))}
          </div>
          
          <a
            href={exportResult.download_url}
            className="btn btn-primary"
            style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}
          >
            Download Bundle
          </a>
        </div>
      )}
    </div>
  );
}

export default ExportPanel;
