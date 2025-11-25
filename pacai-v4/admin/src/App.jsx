import { useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';

function App() {
  const [status, setStatus] = useState('Checking License...');
  const [loading, setLoading] = useState(false);

  const checkLicense = async () => {
    setLoading(true);
    try {
      const result = await invoke('license_check');
      setStatus(result);
    } catch (err) {
      setStatus(`Error: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const generateZone = async () => {
    setLoading(true);
    try {
      const result = await invoke('generate_zone', { prompt: 'test scenario' });
      setStatus(`Generated: ${result}`);
    } catch (err) {
      setStatus(`Error: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-[#0f1113] text-[#d8d8d8] min-h-screen font-sans">
      <h1 className="text-3xl font-bold mb-4">PacAI v4 Admin</h1>
      <div className="space-y-4">
        <button 
          onClick={checkLicense} 
          disabled={loading}
          className="px-4 py-2 bg-[#3e73ff] rounded hover:bg-[#2d5acc]"
        >
          {loading ? 'Loading...' : 'Validate HSM License'}
        </button>
        <button 
          onClick={generateZone} 
          disabled={loading}
          className="px-4 py-2 bg-[#3e73ff] rounded hover:bg-[#2d5acc] ml-2"
        >
          {loading ? 'Loading...' : 'Generate Zone'}
        </button>
        <div className="mt-4 p-4 bg-[#141517] rounded">
          <p className="text-sm">{status}</p>
        </div>
      </div>
    </div>
  );
}

export default App;
