import { useState } from 'react';

const { invoke } = window.__TAURI__ || {};

function NarrativeLab() {
  const [prompt, setPrompt] = useState('');
  const [seed, setSeed] = useState('');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function handleGenerate() {
    if (!prompt.trim()) return;
    
    setGenerating(true);
    setError(null);
    
    try {
      const response = await invoke('generate_world', {
        request: {
          prompt: prompt.trim(),
          seed: seed ? parseInt(seed) : null,
        }
      });
      setResult(response);
    } catch (err) {
      setError(err.toString());
    } finally {
      setGenerating(false);
    }
  }

  const presets = [
    { label: 'Urban Warfare', prompt: 'Dense urban environment with tactical combat zones' },
    { label: 'Arctic Ops', prompt: 'Frozen arctic base with stealth infiltration scenarios' },
    { label: 'Jungle Recon', prompt: 'Dense jungle with guerrilla warfare encounters' },
    { label: 'Desert Storm', prompt: 'Vast desert with convoy ambush scenarios' },
  ];

  return (
    <div>
      <div className="panel">
        <h2 className="panel-title">Narrative Generation Lab</h2>
        
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Quick Presets
          </label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {presets.map(preset => (
              <button
                key={preset.label}
                className="btn btn-secondary"
                style={{ fontSize: '0.8rem', padding: '8px 12px' }}
                onClick={() => setPrompt(preset.prompt)}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
        
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Narrative Prompt
          </label>
          <textarea
            className="input"
            placeholder="Describe the world, scenario, or narrative you want to generate..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </div>
        
        <div className="grid-2" style={{ marginBottom: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Seed (optional)
            </label>
            <input
              className="input"
              type="number"
              placeholder="Random seed for deterministic generation"
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
            />
          </div>
        </div>
        
        <button
          className="btn btn-primary"
          onClick={handleGenerate}
          disabled={generating || !prompt.trim()}
          style={{ opacity: generating ? 0.7 : 1 }}
        >
          {generating ? 'Generating...' : 'Generate World'}
        </button>
      </div>
      
      {error && (
        <div className="panel" style={{ borderColor: 'var(--accent-red)' }}>
          <h3 style={{ color: 'var(--accent-red)', marginBottom: '8px' }}>Error</h3>
          <p style={{ color: 'var(--text-secondary)' }}>{error}</p>
        </div>
      )}
      
      {result && (
        <div className="panel">
          <h2 className="panel-title">Generation Result</h2>
          
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Checksum</span>
              <code style={{ background: 'var(--bg-tertiary)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>
                {result.checksum?.substring(0, 16)}...
              </code>
            </div>
          </div>
          
          {result.narrative && (
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '8px' }}>{result.narrative.title}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{result.narrative.synopsis}</p>
            </div>
          )}
          
          {result.world && (
            <div>
              <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                World: {result.world.name}
              </h4>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                Entities: {result.world.entities?.length || 0} | 
                POI: {result.world.poi?.length || 0} |
                Biome: {result.world.terrain?.biome || 'Unknown'}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default NarrativeLab;
