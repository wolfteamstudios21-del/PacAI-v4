import { useState } from 'react';

const { invoke } = window.__TAURI__ || {};

function LiveOverrides() {
  const [projectId, setProjectId] = useState('');
  const [targetType, setTargetType] = useState('npc');
  const [behavior, setBehavior] = useState('');
  const [parameters, setParameters] = useState('{}');
  const [applying, setApplying] = useState(false);
  const [history, setHistory] = useState([]);

  async function handleApplyOverride() {
    if (!projectId.trim() || !behavior.trim()) return;
    
    setApplying(true);
    
    try {
      let params;
      try {
        params = JSON.parse(parameters);
      } catch {
        params = {};
      }
      
      const response = await invoke('apply_override', {
        request: {
          project_id: projectId.trim(),
          target_type: targetType,
          behavior: behavior.trim(),
          parameters: params,
        }
      });
      
      setHistory(prev => [{
        id: response.id,
        behavior: response.behavior,
        status: response.status,
        appliedAt: new Date().toLocaleTimeString(),
      }, ...prev.slice(0, 9)]);
      
    } catch (err) {
      console.error('Override failed:', err);
    } finally {
      setApplying(false);
    }
  }

  const quickOverrides = [
    { label: 'Riot Mode', behavior: 'aggression_boost', params: { multiplier: 2.0, duration: 300 } },
    { label: 'Stealth Mode', behavior: 'awareness_reduce', params: { factor: 0.5, duration: 180 } },
    { label: 'Patrol Freeze', behavior: 'freeze_patrol', params: { duration: 120 } },
    { label: 'Alert All', behavior: 'global_alert', params: { level: 'high', radius: 500 } },
  ];

  return (
    <div>
      <div className="panel">
        <h2 className="panel-title">Live Behavior Overrides</h2>
        
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Quick Actions
          </label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {quickOverrides.map(override => (
              <button
                key={override.label}
                className="btn btn-secondary"
                style={{ fontSize: '0.8rem', padding: '8px 12px' }}
                onClick={() => {
                  setBehavior(override.behavior);
                  setParameters(JSON.stringify(override.params, null, 2));
                }}
              >
                {override.label}
              </button>
            ))}
          </div>
        </div>
        
        <div className="grid-2" style={{ marginBottom: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Project ID
            </label>
            <input
              className="input"
              placeholder="Enter project UUID"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Target Type
            </label>
            <select
              className="input"
              value={targetType}
              onChange={(e) => setTargetType(e.target.value)}
              style={{ cursor: 'pointer' }}
            >
              <option value="npc">NPC</option>
              <option value="environment">Environment</option>
              <option value="global">Global</option>
              <option value="faction">Faction</option>
            </select>
          </div>
        </div>
        
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Behavior
          </label>
          <input
            className="input"
            placeholder="Behavior identifier (e.g., aggression_boost)"
            value={behavior}
            onChange={(e) => setBehavior(e.target.value)}
          />
        </div>
        
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Parameters (JSON)
          </label>
          <textarea
            className="input"
            placeholder='{"key": "value"}'
            value={parameters}
            onChange={(e) => setParameters(e.target.value)}
            style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
          />
        </div>
        
        <button
          className="btn btn-primary"
          onClick={handleApplyOverride}
          disabled={applying || !projectId.trim() || !behavior.trim()}
          style={{ opacity: applying ? 0.7 : 1 }}
        >
          {applying ? 'Applying...' : 'Apply Override'}
        </button>
      </div>
      
      {history.length > 0 && (
        <div className="panel">
          <h2 className="panel-title">Override History</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {history.map((item, index) => (
              <div
                key={item.id || index}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px',
                  background: 'var(--bg-tertiary)',
                  borderRadius: '8px',
                }}
              >
                <div>
                  <div style={{ fontWeight: '500' }}>{item.behavior}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                    {item.appliedAt}
                  </div>
                </div>
                <div
                  style={{
                    padding: '4px 8px',
                    background: item.status === 'applied' ? 'var(--accent-green)' : 'var(--accent-orange)',
                    color: 'white',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                  }}
                >
                  {item.status?.toUpperCase()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default LiveOverrides;
