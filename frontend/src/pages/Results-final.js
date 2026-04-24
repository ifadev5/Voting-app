import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || '';

export default function Results() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    checkVisibilityAndLoad();
  }, []);

  async function checkVisibilityAndLoad() {
    try {
      const visRes = await axios.get(`${API}/api/settings/results-visible`);
      setVisible(visRes.data.visible);
      if (visRes.data.visible) {
        const res = await axios.get(`${API}/api/results`);
        setResults(res.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  // ── RESULTS HIDDEN ─────────────────────────────────────────
  if (!loading && !visible) {
    return (
      <div style={{
        minHeight: '70vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        textAlign: 'center',
      }}>
        <div>
          <div style={{ fontSize: 80, marginBottom: 24 }}>🔒</div>
          <h1 style={{ fontSize: 'clamp(24px, 5vw, 40px)', marginBottom: 16 }}>
            Results are currently
            <span style={{
              display: 'block',
              background: 'linear-gradient(135deg, #C9A84C, #E8C86A)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              Locked 🏆
            </span>
          </h1>
          <p style={{ color: '#9A9488', fontSize: 16, maxWidth: 420, margin: '0 auto 24px' }}>
            The results are being finalized. Winners will be announced soon!
          </p>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            background: 'rgba(201,168,76,0.08)',
            border: '1px solid rgba(201,168,76,0.2)',
            borderRadius: 12,
            padding: '14px 24px',
            color: '#C9A84C',
            fontSize: 14,
            fontWeight: 600,
          }}>
            🗳️ Voting is still open — cast your vote now!
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '48px 24px' }}>
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <div style={{ fontSize: 13, color: '#C9A84C', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: 12 }}>
          Live Results
        </div>
        <h1 style={{ fontSize: 'clamp(28px, 5vw, 44px)' }}>Vote Standings</h1>
        <p style={{ color: '#9A9488', marginTop: 10 }}>Only approved votes are counted</p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#9A9488' }}>Loading results...</div>
      ) : results.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#9A9488' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
          No results yet.
        </div>
      ) : (
        results.map(({ category, candidates }) => {
          const maxVotes = Math.max(...candidates.map(c => c.votes), 1);
          return (
            <div key={category} style={{ marginBottom: 56 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <h2 style={{ fontSize: 22, color: '#F0EDE4' }}>{category}</h2>
                <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(201,168,76,0.3), transparent)' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {candidates.map((c, i) => (
                  <div key={c._id} style={{
                    background: '#161616',
                    border: `1px solid ${i === 0 ? 'rgba(201,168,76,0.35)' : '#2A2A2A'}`,
                    borderRadius: 12,
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: i === 0 ? 'rgba(201,168,76,0.2)' : '#1F1F1F',
                      color: i === 0 ? '#C9A84C' : '#9A9488',
                      fontWeight: 700, fontSize: 15, flexShrink: 0,
                    }}>
                      {i === 0 ? '🥇' : `#${i + 1}`}
                    </div>
                    {c.image && (
                      <img
                        src={c.image.startsWith('http') ? c.image : `${API}${c.image}`}
                        alt={c.name}
                        style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                      />
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, marginBottom: 6 }}>{c.name}</div>
                      <div style={{ background: '#2A2A2A', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${(c.votes / maxVotes) * 100}%`,
                          background: i === 0 ? 'linear-gradient(90deg, #C9A84C, #E8C86A)' : '#3A3A3A',
                          borderRadius: 4,
                          transition: 'width 1s ease',
                        }} />
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 20, color: i === 0 ? '#C9A84C' : '#F0EDE4' }}>{c.votes}</div>
                      <div style={{ fontSize: 11, color: '#9A9488' }}>votes</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}