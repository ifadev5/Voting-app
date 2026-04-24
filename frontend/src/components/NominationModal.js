import React, { useState } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || '';

export default function NominationModal({ onClose }) {
  const [form, setForm] = useState({ studentName: '', staffName: '' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.studentName.trim()) return setError('Please enter your full name.');
    if (!form.staffName.trim()) return setError('Please enter the staff name.');

    setLoading(true);
    try {
      await axios.post(`${API}/api/nominations`, {
        studentName: form.studentName.trim(),
        staffName: form.staffName.trim(),
      });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Submission failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={e => e.stopPropagation()} style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 60, marginBottom: 16 }}>🏆</div>
          <h2 style={{ color: '#C9A84C', marginBottom: 12 }}>Nomination Submitted!</h2>
          <p style={{ color: '#9A9488', marginBottom: 8 }}>
            Thank you for nominating
          </p>
          <p style={{ color: '#F0EDE4', fontWeight: 700, fontSize: 20, marginBottom: 24 }}>
            {form.staffName}
          </p>
          <p style={{ color: '#9A9488', fontSize: 14, marginBottom: 28 }}>
            Your nomination for <strong>Staff of the Year</strong> has been recorded. ✅
          </p>
          <button
            className="btn btn-gold"
            onClick={onClose}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h2 style={{ color: '#C9A84C', fontSize: 22 }}>Staff of the Year</h2>
            <p style={{ color: '#9A9488', fontSize: 13, marginTop: 4 }}>
              Nominate your favourite staff member
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', color: '#9A9488', fontSize: 22, cursor: 'pointer' }}>×</button>
        </div>

        {/* Info banner */}
        <div style={{
          background: 'rgba(201,168,76,0.08)',
          border: '1px solid rgba(201,168,76,0.25)',
          borderRadius: 10,
          padding: 14,
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <span style={{ fontSize: 28 }}>🎖️</span>
          <div>
            <div style={{ fontWeight: 700, color: '#C9A84C', fontSize: 14 }}>Free Nomination</div>
            <div style={{ color: '#9A9488', fontSize: 13 }}>
              No payment needed — just type the name of the staff you want to win!
            </div>
          </div>
        </div>

        {/* Notice */}
        <div style={{
          background: 'rgba(224,90,90,0.08)',
          border: '1px solid rgba(224,90,90,0.2)',
          borderRadius: 8,
          padding: '10px 14px',
          marginBottom: 20,
          fontSize: 13,
          color: '#E05A5A',
          fontWeight: 600,
        }}>
          ⚠️ You MUST submit a Staff of the Year nomination to complete your participation!
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Your Full Name</label>
            <input
              type="text"
              placeholder="Enter your full name"
              value={form.studentName}
              onChange={e => setForm(f => ({ ...f, studentName: e.target.value }))}
            />
          </div>

          <div className="form-group">
            <label>Staff Name</label>
            <input
              type="text"
              placeholder="Type the staff name you are nominating"
              value={form.staffName}
              onChange={e => setForm(f => ({ ...f, staffName: e.target.value }))}
            />
          </div>

          {error && (
            <div style={{
              color: '#E05A5A',
              background: 'rgba(224,90,90,0.1)',
              border: '1px solid rgba(224,90,90,0.2)',
              borderRadius: 8,
              padding: '10px 14px',
              marginBottom: 16,
              fontSize: 14,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-gold"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: 16 }}
          >
            {loading ? 'Submitting...' : '🏆 Submit Nomination'}
          </button>
        </form>
      </div>
    </div>
  );
}