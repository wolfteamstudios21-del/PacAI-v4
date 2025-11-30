import { useState } from 'react';

function CommunityHub() {
  const [activeSection, setActiveSection] = useState('discord');

  const sections = [
    { id: 'discord', label: 'Discord', icon: '💬' },
    { id: 'docs', label: 'Documentation', icon: '📚' },
    { id: 'changelog', label: 'Changelog', icon: '📋' },
    { id: 'support', label: 'Support', icon: '🎫' },
  ];

  const changelog = [
    {
      version: '5.0.0',
      date: 'November 2024',
      changes: [
        'Rust Axum gateway (50-100× performance)',
        'Hardware-root licensing (YubiHSM2/Nitrokey3)',
        '7-engine export system',
        'Hash-chained audit logs',
        'Tauri desktop admin console',
      ],
    },
    {
      version: '4.0.0',
      date: 'October 2024',
      changes: [
        'Universal schema v2.0',
        'Deterministic generation',
        'Live override injection',
        'SSE streaming',
      ],
    },
  ];

  const docs = [
    { title: 'Getting Started', desc: 'Quick start guide for PacAI v5' },
    { title: 'API Reference', desc: 'Complete REST API documentation' },
    { title: 'Export Formats', desc: 'Supported engines and file formats' },
    { title: 'Licensing', desc: 'Hardware-root licensing guide' },
    { title: 'Offline Mode', desc: 'Air-gapped deployment guide' },
  ];

  return (
    <div>
      <div className="panel">
        <h2 className="panel-title">Community Hub</h2>
        
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          {sections.map(section => (
            <button
              key={section.id}
              className={`btn ${activeSection === section.id ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveSection(section.id)}
            >
              <span style={{ marginRight: '8px' }}>{section.icon}</span>
              {section.label}
            </button>
          ))}
        </div>
        
        {activeSection === 'discord' && (
          <div>
            <div style={{ 
              background: '#5865F2', 
              padding: '24px', 
              borderRadius: '12px',
              marginBottom: '16px',
              textAlign: 'center'
            }}>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Join the Pack</h3>
              <p style={{ marginBottom: '16px', opacity: 0.9 }}>
                300+ creators building with PacAI
              </p>
              <a
                href="https://discord.gg/TtfHgfCQMY"
                target="_blank"
                rel="noopener noreferrer"
                className="btn"
                style={{ 
                  background: 'white', 
                  color: '#5865F2',
                  textDecoration: 'none',
                  display: 'inline-block'
                }}
              >
                Open Discord
              </a>
            </div>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(3, 1fr)', 
              gap: '12px',
              textAlign: 'center' 
            }}>
              <div style={{ padding: '16px', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--accent-blue)' }}>300+</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Members</div>
              </div>
              <div style={{ padding: '16px', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--accent-green)' }}>247</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Lifetime Slots</div>
              </div>
              <div style={{ padding: '16px', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--accent-orange)' }}>9</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Engines</div>
              </div>
            </div>
          </div>
        )}
        
        {activeSection === 'docs' && (
          <div>
            {docs.map((doc, idx) => (
              <div
                key={idx}
                style={{
                  padding: '16px',
                  background: 'var(--bg-tertiary)',
                  borderRadius: '8px',
                  marginBottom: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                className="hover-item"
              >
                <div style={{ fontWeight: '500', marginBottom: '4px' }}>{doc.title}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{doc.desc}</div>
              </div>
            ))}
          </div>
        )}
        
        {activeSection === 'changelog' && (
          <div>
            {changelog.map((release, idx) => (
              <div
                key={idx}
                style={{
                  padding: '16px',
                  background: 'var(--bg-tertiary)',
                  borderRadius: '8px',
                  marginBottom: '12px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ 
                    fontWeight: '600', 
                    fontSize: '1.1rem',
                    color: 'var(--accent-blue)' 
                  }}>
                    v{release.version}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>
                    {release.date}
                  </div>
                </div>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  {release.changes.map((change, cidx) => (
                    <li 
                      key={cidx} 
                      style={{ 
                        marginBottom: '6px', 
                        fontSize: '0.9rem',
                        color: 'var(--text-secondary)' 
                      }}
                    >
                      {change}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
        
        {activeSection === 'support' && (
          <div>
            <div style={{ 
              padding: '24px', 
              background: 'var(--bg-tertiary)', 
              borderRadius: '12px',
              textAlign: 'center',
              marginBottom: '16px'
            }}>
              <h3 style={{ marginBottom: '8px' }}>Need Help?</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
                Our team is here to assist you
              </p>
              <a
                href="mailto:wolfteamstudios21@gmail.com"
                className="btn btn-primary"
                style={{ textDecoration: 'none', display: 'inline-block' }}
              >
                Contact Support
              </a>
            </div>
            
            <div style={{ 
              padding: '16px', 
              background: 'var(--bg-tertiary)', 
              borderRadius: '8px' 
            }}>
              <div style={{ fontWeight: '500', marginBottom: '8px' }}>Contact Information</div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <div style={{ marginBottom: '8px' }}>
                  <strong>Email:</strong> wolfteamstudios21@gmail.com
                </div>
                <div>
                  <strong>Discord:</strong> discord.gg/TtfHgfCQMY
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CommunityHub;
