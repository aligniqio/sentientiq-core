// Boardroom.tsx
import React, { useState } from 'react';
import { ssePost } from './ssePost';

interface PersonaResponse {
  label: string;
  content: string;
  status: 'waiting' | 'thinking' | 'complete';
}

export function Boardroom() {
  const [prompt, setPrompt] = useState('');
  const [personas, setPersonas] = useState<Record<string, PersonaResponse>>({});
  const [loading, setLoading] = useState(false);

  const runDebate = async () => {
    setLoading(true);
    setPersonas({});
    
    const personaMap: Record<string, PersonaResponse> = {};

    try {
      await ssePost(
        'https://app.sentientiq.ai/v1/boardroom',
        { prompt, topK: 6 },
        ({ event, data }) => {
          switch (event) {
            case 'start':
              console.log(`Starting debate with ${data.personas} personas`);
              break;
              
            case 'phase':
              if (data.label && data.label !== 'retrieval') {
                if (data.status === 'begin') {
                  personaMap[data.label] = {
                    label: data.label,
                    content: '',
                    status: 'thinking'
                  };
                } else if (data.status === 'end') {
                  personaMap[data.label] = {
                    ...personaMap[data.label],
                    status: 'complete'
                  };
                }
                setPersonas({ ...personaMap });
              }
              break;
              
            case 'delta':
              if (data.label && data.text) {
                personaMap[data.label] = {
                  label: data.label,
                  content: (personaMap[data.label]?.content || '') + data.text,
                  status: 'thinking'
                };
                setPersonas({ ...personaMap });
              }
              break;
              
            case 'done':
              setLoading(false);
              break;
              
            case 'error':
              console.error('Error:', data);
              setLoading(false);
              break;
          }
        }
      );
    } catch (err) {
      console.error('SSE Error:', err);
      setLoading(false);
    }
  };

  return (
    <div className="boardroom">
      <h1>🧠 SentientIQ Boardroom</h1>
      <p>12 AI experts analyze emotional intelligence</p>
      
      <div className="prompt-input">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter your marketing challenge..."
          rows={3}
        />
        <button onClick={runDebate} disabled={loading || !prompt}>
          {loading ? 'Debating...' : 'Start Boardroom Debate'}
        </button>
      </div>

      <div className="personas-grid">
        {Object.values(personas).map((persona) => (
          <div key={persona.label} className={`persona-card ${persona.status}`}>
            <h3>{persona.label}</h3>
            <div className="persona-content">
              {persona.content || '...'}
            </div>
            <div className={`status-indicator ${persona.status}`}>
              {persona.status === 'thinking' ? '🤔' : '✅'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}