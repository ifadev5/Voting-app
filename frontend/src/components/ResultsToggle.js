import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || '';

export default function ResultsToggle({ token }) {
  const [visible, setVisible] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    axios.get(`${API}/api/settings/results-visible`)
      .then(r => setVisible(r.data.visible))
      .catch(console.error);
  }, []);

  async function toggle() {
    setLoading(true);
    try {
      const newValue = !visible;
      await axios.post(`${API}/api/settings/results-visible`, { visible: newValue }, {
        headers: { 'x-admin-token': token },
      });
      setVisible(newValue);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      background: visible ? 'rgba(76,175,126,0.08)' : 'rgba(224,90,90,0.08)',
      border: `1px solid ${visible ? 'rgba(76,175,126,0.25)' : 'rgba(224,90,90,0.25)'}`,
      borderRadius: 12,
      padding: '16px 20px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 24,
    }}>
      <div>
        <div style={{ fontWeight: 700, fontSize: 15, color: visible ? '#4CAF7E' : '#E05A5A' }}>
          {visible ? '👁️ Results are PUBLIC' : '🔒 Results are HIDDEN'}
        </div>
        <div style={{ fontSize: 13, color: '#9A9488', marginTop: 4 }}>
          {visible
            ? 'Students can see the current vote standings on the Results page'
            : 'Results page is locked — students only see a "coming soon" message'
          }
        </div>
      </div>
      <button
        onClick={toggle}
        disabled={loading}
        style={{
          padding: '10px 20px',
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 700,
          border: `1px solid ${visible ? 'rgba(224,90,90,0.4)' : 'rgba(76,175,126,0.4)'}`,
          background: visible ? 'rgba(224,90,90,0.1)' : 'rgba(76,175,126,0.1)',
          color: visible ? '#E05A5A' : '#4CAF7E',
          cursor: loading ? 'not-allowed' : 'pointer',
          flexShrink: 0,
          transition: 'all 0.2s',
        }}
      >
        {loading ? '...' : visible ? '🔒 Lock Results' : '👁️ Show Results'}
      </button>
    </div>
  );
}