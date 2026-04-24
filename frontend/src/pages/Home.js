import React, { useState, useEffect } from 'react';
import axios from 'axios';
import CandidateCard from '../components/CandidateCard';
import VoteModal from '../components/VoteModal';
import NominationModal from '../components/NominationModal';

const API = process.env.REACT_APP_API_URL || '';

export default function Home() {
  const [candidates, setCandidates] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [voteCandidate, setVoteCandidate] = useState(null);
  const [showNomination, setShowNomination] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const res = await axios.get(`${API}/api/candidates`);
      setCandidates(res.data);
      const cats = ['All', ...new Set(res.data.map(c => c.category))];
      setCategories(cats);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const filtered = selectedCategory === 'All'
    ? candidates
    : candidates.filter(c => c.category === selectedCategory);

  const grouped = {};
  filtered.forEach(c => {
    if (!grouped[c.category]) grouped[c.category] = [];
    grouped[c.category].push(c);
  });

  return (
    <div>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(180deg, rgba(201,168,76,0.08) 0%, transparent 100%)',
        borderBottom: '1px solid rgba(201,168,76,0.1)',
        padding: '60px 24px 50px',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#C9A84C', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: 16 }}>
            University Awards
          </div>
          <h1 style={{ fontSize: 'clamp(32px, 6vw, 56px)', marginBottom: 16, lineHeight: 1.1 }}>
            Vote for Your<br />
            <span style={{ background: 'linear-gradient(135deg, #C9A84C, #E8C86A)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Favourite Candidates
            </span>
          </h1>
          <p style={{ color: '#9A9488', fontSize: 16, maxWidth: 440, margin: '0 auto 20px' }}>
            Support your peers by voting. Every ₦200 counts as 1 vote. Pay via OPay and submit your transaction reference.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: 30, padding: '8px 18px' }}>
              <span style={{ color: '#C9A84C', fontWeight: 700 }}>₦200</span>
              <span style={{ color: '#9A9488' }}>=</span>
              <span style={{ color: '#F0EDE4', fontWeight: 600 }}>1 Vote</span>
            </div>
            <button
              onClick={() => setShowNomination(true)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.4)',
                borderRadius: 30, padding: '8px 18px', color: '#C9A84C',
                fontWeight: 700, fontSize: 14, cursor: 'pointer',
              }}
            >
              🏆 Nominate Staff of the Year
            </button>
          </div>
        </div>
      </div>

      <div className="container" style={{ padding: '40px 24px 120px' }}>
        {/* Category Filter */}
        {categories.length > 1 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 40 }}>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: '8px 18px', borderRadius: 30, fontSize: 13, fontWeight: 600,
                  border: selectedCategory === cat ? '1px solid #C9A84C' : '1px solid #2A2A2A',
                  background: selectedCategory === cat ? 'rgba(201,168,76,0.1)' : '#161616',
                  color: selectedCategory === cat ? '#C9A84C' : '#9A9488',
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 80, color: '#9A9488' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⏳</div>
            Loading candidates...
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <div style={{ textAlign: 'center', padding: 80, color: '#9A9488' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🎭</div>
            <p>No candidates yet. Check back soon!</p>
          </div>
        ) : (
          Object.entries(grouped).map(([category, cats]) => (
            <div key={category} style={{ marginBottom: 56 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
                <h2 style={{ fontSize: 26, color: '#F0EDE4' }}>{category}</h2>
                <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(201,168,76,0.3), transparent)' }} />
                <span style={{ fontSize: 13, color: '#9A9488' }}>{cats.length} candidate{cats.length !== 1 ? 's' : ''}</span>
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                gap: 20,
              }}>
                {cats.map(c => (
                  <CandidateCard key={c._id} candidate={c} onVote={setVoteCandidate} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── FLOATING NOMINATION BUTTON ─────────────────────── */}
      <button
        onClick={() => setShowNomination(true)}
        style={{
          position: 'fixed',
          bottom: 28,
          right: 28,
          zIndex: 999,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '14px 22px',
          borderRadius: 50,
          background: 'linear-gradient(135deg, #C9A84C, #9A7A2E)',
          color: '#0D0D0D',
          fontWeight: 800,
          fontSize: 14,
          fontFamily: "'DM Sans', sans-serif",
          border: 'none',
          cursor: 'pointer',
          boxShadow: '0 8px 32px rgba(201,168,76,0.4)',
          transition: 'all 0.2s ease',
          animation: 'pulse 2.5s infinite',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'scale(1.05)';
          e.currentTarget.style.boxShadow = '0 12px 40px rgba(201,168,76,0.6)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 8px 32px rgba(201,168,76,0.4)';
        }}
      >
        🏆 Staff of the Year
      </button>

      {/* Pulse animation */}
      <style>{`
        @keyframes pulse {
          0% { box-shadow: 0 8px 32px rgba(201,168,76,0.4); }
          50% { box-shadow: 0 8px 48px rgba(201,168,76,0.7); }
          100% { box-shadow: 0 8px 32px rgba(201,168,76,0.4); }
        }
      `}</style>

      {/* Modals */}
      {voteCandidate && (
        <VoteModal candidate={voteCandidate} onClose={() => setVoteCandidate(null)} />
      )}
      {showNomination && (
        <NominationModal onClose={() => setShowNomination(false)} />
      )}
    </div>
  );
}