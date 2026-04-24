import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import ResultsToggle from '../components/ResultsToggle';

const API = process.env.REACT_APP_API_URL || '';

const adminAxios = (token) => axios.create({
  baseURL: API,
  headers: { 'x-admin-token': token },
});

export default function Admin() {
  const [token, setToken] = useState(() => localStorage.getItem('admin_token') || '');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [tab, setTab] = useState('submissions');

  const [submissions, setSubmissions] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [categories, setCategories] = useState([]);
  const [nominations, setNominations] = useState([]);
  const [staffCounts, setStaffCounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: 'success' });

  const [candForm, setCandForm] = useState({ name: '', category: '', newCategory: '' });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [catName, setCatName] = useState('');
  const [updatingPhotoId, setUpdatingPhotoId] = useState(null);
  const fileInputRef = useRef();

  const isLoggedIn = token === 'admin-token-secret';

  useEffect(() => {
    if (isLoggedIn) loadAll();
  }, [isLoggedIn]);

  async function loadAll() {
    setLoading(true);
    try {
      const ax = adminAxios(token);
      const [subRes, canRes, catRes, nomRes] = await Promise.all([
        ax.get('/api/submissions'),
        axios.get(`${API}/api/candidates`),
        axios.get(`${API}/api/categories`),
        ax.get('/api/nominations'),
      ]);
      setSubmissions(subRes.data);
      setCandidates(canRes.data);
      setCategories(catRes.data);
      setNominations(nomRes.data.nominations);
      setStaffCounts(nomRes.data.staffCounts);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  function flash(text, type = 'success') {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: '', type: 'success' }), 4000);
  }

  async function handleLogin(e) {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await axios.post(`${API}/api/admin/login`, loginForm);
      if (res.data.success) {
        const t = res.data.token;
        setToken(t);
        localStorage.setItem('admin_token', t);
      }
    } catch {
      setLoginError('Invalid username or password.');
    }
  }

  function logout() {
    setToken('');
    localStorage.removeItem('admin_token');
  }

  async function approve(id) {
    try {
      const res = await adminAxios(token).post(`/api/approve/${id}`);
      flash(res.data.message);
      setSubmissions(s => s.map(x => x._id === id ? { ...x, status: 'approved' } : x));
    } catch (e) { flash(e.response?.data?.message || 'Error', 'error'); }
  }

  async function reject(id) {
    try {
      await adminAxios(token).post(`/api/reject/${id}`);
      flash('Submission rejected.');
      setSubmissions(s => s.map(x => x._id === id ? { ...x, status: 'rejected' } : x));
    } catch (e) { flash(e.response?.data?.message || 'Error', 'error'); }
  }

  async function deleteCandidate(id) {
    if (!window.confirm('Delete this candidate?')) return;
    try {
      await adminAxios(token).delete(`/api/candidates/${id}`);
      setCandidates(c => c.filter(x => x._id !== id));
      flash('Candidate deleted.');
    } catch (e) { flash('Error deleting candidate.', 'error'); }
  }

  async function deleteNomination(id) {
    if (!window.confirm('Delete this nomination?')) return;
    try {
      await adminAxios(token).delete(`/api/nominations/${id}`);
      const updated = nominations.filter(x => x._id !== id);
      setNominations(updated);
      // Recount
      const counts = {};
      updated.forEach(n => {
        const key = n.staffName.toLowerCase().trim();
        if (!counts[key]) counts[key] = { staffName: n.staffName, count: 0 };
        counts[key].count++;
      });
      setStaffCounts(Object.values(counts).sort((a, b) => b.count - a.count));
      flash('Nomination deleted.');
    } catch (e) { flash('Error', 'error'); }
  }

  async function addCandidate(e) {
    e.preventDefault();
    const categoryToUse = candForm.category === '__new__' ? candForm.newCategory : candForm.category;
    if (!candForm.name || !categoryToUse) return flash('Name and category are required.', 'error');

    const fd = new FormData();
    fd.append('name', candForm.name);
    fd.append('category', categoryToUse);
    if (imageFile) fd.append('image', imageFile);

    try {
      const res = await adminAxios(token).post('/api/candidates', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setCandidates(c => [...c, res.data]);
      setCandForm({ name: '', category: '', newCategory: '' });
      setImageFile(null);
      setImagePreview('');
      flash('Candidate added!');
      loadAll();
    } catch (e) { flash(e.response?.data?.message || 'Error', 'error'); }
  }

  async function addCategory(e) {
    e.preventDefault();
    if (!catName.trim()) return;
    try {
      const res = await adminAxios(token).post('/api/categories', { name: catName });
      setCategories(c => [...c, res.data]);
      setCatName('');
      flash('Category added!');
    } catch (e) { flash(e.response?.data?.message || 'Error adding category', 'error'); }
  }

  async function deleteCategory(id) {
    if (!window.confirm('Delete this category?')) return;
    try {
      await adminAxios(token).delete(`/api/categories/${id}`);
      setCategories(c => c.filter(x => x._id !== id));
      flash('Category deleted.');
    } catch (e) { flash('Error', 'error'); }
  }

  function handleImageChange(e) {
    const f = e.target.files[0];
    if (!f) return;
    setImageFile(f);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(f);
  }

  function triggerPhotoUpdate(candidateId) {
    setUpdatingPhotoId(candidateId);
    setTimeout(() => fileInputRef.current?.click(), 100);
  }

  async function handlePhotoUpdate(e) {
    const file = e.target.files[0];
    if (!file || !updatingPhotoId) return;
    flash('Uploading photo...');
    const fd = new FormData();
    fd.append('image', file);
    try {
      const res = await adminAxios(token).patch(`/api/candidates/${updatingPhotoId}/photo`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setCandidates(c => c.map(x => x._id === updatingPhotoId ? { ...x, image: res.data.image } : x));
      flash('✅ Photo updated successfully!');
    } catch (e) {
      flash('Failed to update photo. Try again.', 'error');
    } finally {
      setUpdatingPhotoId(null);
      e.target.value = '';
    }
  }

  // ── LOGIN ──────────────────────────────────────────────────────
  if (!isLoggedIn) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ background: '#161616', border: '1px solid #2A2A2A', borderRadius: 16, padding: 40, width: '100%', maxWidth: 400 }}>
          <h2 style={{ textAlign: 'center', marginBottom: 8, color: '#C9A84C' }}>Admin Panel</h2>
          <p style={{ textAlign: 'center', color: '#9A9488', marginBottom: 28, fontSize: 14 }}>Sign in to manage votes</p>
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Username</label>
              <input type="text" placeholder="admin" value={loginForm.username}
                onChange={e => setLoginForm(f => ({ ...f, username: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" placeholder="••••••••" value={loginForm.password}
                onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))} />
            </div>
            {loginError && <div style={{ color: '#E05A5A', fontSize: 14, marginBottom: 16 }}>{loginError}</div>}
            <button type="submit" className="btn btn-gold" style={{ width: '100%', justifyContent: 'center', padding: 14 }}>
              Sign In
            </button>
          </form>
        </div>
      </div>
    );
  }

  const pending = submissions.filter(s => s.status === 'pending').length;
  const approved = submissions.filter(s => s.status === 'approved').length;
  const maxNomCount = staffCounts.length > 0 ? staffCounts[0].count : 1;

  return (
    <div className="container" style={{ padding: '32px 24px' }}>
      {/* Hidden file input */}
      <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handlePhotoUpdate} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 28 }}>Admin Dashboard</h1>
          <p style={{ color: '#9A9488', fontSize: 14 }}>Manage votes, candidates & nominations</p>
        </div>
        <button className="btn btn-outline" onClick={logout}>Sign Out</button>
      </div>

      {/* Flash */}
      {msg.text && (
        <div style={{
          background: msg.type === 'error' ? 'rgba(224,90,90,0.1)' : 'rgba(76,175,126,0.1)',
          border: `1px solid ${msg.type === 'error' ? 'rgba(224,90,90,0.3)' : 'rgba(76,175,126,0.3)'}`,
          color: msg.type === 'error' ? '#E05A5A' : '#4CAF7E',
          borderRadius: 8, padding: '12px 16px', marginBottom: 24, fontSize: 14,
        }}>
          {msg.text}
        </div>
      )}
      <ResultsToggle token={token} />

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'Submissions', value: submissions.length, color: '#C9A84C' },
          { label: 'Pending', value: pending, color: '#E8A83A' },
          { label: 'Approved', value: approved, color: '#4CAF7E' },
          { label: 'Candidates', value: candidates.length, color: '#9A9488' },
          { label: 'Nominations', value: nominations.length, color: '#C9A84C' },
        ].map(s => (
          <div key={s.label} style={{ background: '#161616', border: '1px solid #2A2A2A', borderRadius: 12, padding: '20px' }}>
            <div style={{ fontSize: 30, fontWeight: 900, color: s.color, fontFamily: "'Playfair Display', serif" }}>{s.value}</div>
            <div style={{ color: '#9A9488', fontSize: 13, marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, background: '#161616', borderRadius: 10, padding: 4, marginBottom: 28, flexWrap: 'wrap' }}>
        {['submissions', 'nominations', 'candidates', 'categories'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
            background: tab === t ? '#2A2A2A' : 'transparent',
            color: tab === t ? '#C9A84C' : '#9A9488',
            cursor: 'pointer', border: 'none', textTransform: 'capitalize',
          }}>
            {t === 'nominations' ? '🏆 ' : ''}{t}
            {t === 'submissions' && pending > 0 && (
              <span style={{ background: '#E8A83A', color: '#0D0D0D', borderRadius: 10, padding: '1px 7px', fontSize: 11, marginLeft: 4 }}>
                {pending}
              </span>
            )}
            {t === 'nominations' && nominations.length > 0 && (
              <span style={{ background: '#C9A84C', color: '#0D0D0D', borderRadius: 10, padding: '1px 7px', fontSize: 11, marginLeft: 4 }}>
                {nominations.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── SUBMISSIONS TAB ────────────────────── */}
      {tab === 'submissions' && (
        <div>
          {loading ? <div style={{ color: '#9A9488', padding: 40 }}>Loading...</div> : (
            submissions.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#9A9488', padding: 60 }}>No submissions yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {submissions.map(s => (
                  <div key={s._id} style={{
                    background: '#161616',
                    border: `1px solid ${s.status === 'pending' ? 'rgba(232,168,58,0.2)' : '#2A2A2A'}`,
                    borderRadius: 12, padding: '18px 20px',
                  }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                      <div>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>{s.fullName}</div>
                        <div style={{ fontSize: 13, color: '#9A9488' }}>{s.candidateName} · {s.category}</div>
                        <div style={{ fontSize: 13, color: '#9A9488', marginTop: 2 }}>
                          Ref: <span style={{ color: '#F0EDE4', fontFamily: 'monospace' }}>{s.transactionRef}</span>
                        </div>
                        <div style={{ fontSize: 12, color: '#9A9488', marginTop: 4 }}>{new Date(s.createdAt).toLocaleString()}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, color: '#C9A84C', fontSize: 18 }}>₦{s.amountPaid.toLocaleString()}</div>
                        <div style={{ fontSize: 13, color: '#9A9488', marginBottom: 10 }}>{s.votes} vote{s.votes !== 1 ? 's' : ''}</div>
                        <span className={`badge badge-${s.status}`}>{s.status}</span>
                      </div>
                    </div>
                    {s.status === 'pending' && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                        <button className="btn btn-success" style={{ fontSize: 13, padding: '8px 16px' }} onClick={() => approve(s._id)}>✓ Approve</button>
                        <button className="btn btn-danger" style={{ fontSize: 13, padding: '8px 16px' }} onClick={() => reject(s._id)}>✗ Reject</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      )}

      {/* ── NOMINATIONS TAB ───────────────────── */}
      {tab === 'nominations' && (
        <div>
          {nominations.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#9A9488', padding: 60 }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🏆</div>
              No nominations yet.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 32, alignItems: 'start' }}>

              {/* LEFT — Staff leaderboard */}
              <div>
                <h3 style={{ marginBottom: 6, fontSize: 17 }}>🏆 Staff Nomination Count</h3>
                <p style={{ color: '#9A9488', fontSize: 13, marginBottom: 16 }}>Ranked by number of nominations</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {staffCounts.map((s, i) => (
                    <div key={s.staffName} style={{
                      background: '#161616',
                      border: `1px solid ${i === 0 ? 'rgba(201,168,76,0.4)' : '#2A2A2A'}`,
                      borderRadius: 12, padding: '14px 18px',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 18 }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</span>
                          <span style={{ fontWeight: 700, color: i === 0 ? '#C9A84C' : '#F0EDE4' }}>{s.staffName}</span>
                        </div>
                        <span style={{
                          background: i === 0 ? 'rgba(201,168,76,0.15)' : '#1F1F1F',
                          color: i === 0 ? '#C9A84C' : '#9A9488',
                          border: i === 0 ? '1px solid rgba(201,168,76,0.3)' : '1px solid #2A2A2A',
                          borderRadius: 20, padding: '3px 12px', fontSize: 13, fontWeight: 700,
                        }}>
                          {s.count} nomination{s.count !== 1 ? 's' : ''}
                        </span>
                      </div>
                      {/* Progress bar */}
                      <div style={{ background: '#2A2A2A', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${(s.count / maxNomCount) * 100}%`,
                          background: i === 0 ? 'linear-gradient(90deg, #C9A84C, #E8C86A)' : '#3A3A3A',
                          borderRadius: 4,
                          transition: 'width 1s ease',
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* RIGHT — All individual nominations */}
              <div>
                <h3 style={{ marginBottom: 6, fontSize: 17 }}>All Nominations ({nominations.length})</h3>
                <p style={{ color: '#9A9488', fontSize: 13, marginBottom: 16 }}>Every student submission</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 600, overflowY: 'auto' }}>
                  {nominations.map((n, i) => (
                    <div key={n._id} style={{
                      background: '#161616', border: '1px solid #2A2A2A',
                      borderRadius: 10, padding: '12px 16px',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
                    }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: '#F0EDE4' }}>
                          🏆 {n.staffName}
                        </div>
                        <div style={{ fontSize: 12, color: '#9A9488', marginTop: 3 }}>
                          Nominated by: <span style={{ color: '#C9A84C' }}>{n.studentName}</span>
                        </div>
                        <div style={{ fontSize: 11, color: '#9A9488', marginTop: 2 }}>
                          {new Date(n.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <button
                        onClick={() => deleteNomination(n._id)}
                        style={{
                          background: 'rgba(224,90,90,0.1)', border: '1px solid rgba(224,90,90,0.2)',
                          color: '#E05A5A', borderRadius: 6, padding: '5px 10px',
                          fontSize: 12, cursor: 'pointer', flexShrink: 0,
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── CANDIDATES TAB ────────────────────── */}
      {tab === 'candidates' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 32, alignItems: 'start' }}>
          <div style={{ background: '#161616', border: '1px solid #2A2A2A', borderRadius: 12, padding: 24 }}>
            <h3 style={{ marginBottom: 20, fontSize: 17 }}>Add Candidate</h3>
            <form onSubmit={addCandidate}>
              <div className="form-group">
                <label>Full Name</label>
                <input type="text" placeholder="Candidate name" value={candForm.name}
                  onChange={e => setCandForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Category</label>
                <select value={candForm.category} onChange={e => setCandForm(f => ({ ...f, category: e.target.value }))}>
                  <option value="">Select category</option>
                  {categories.map(c => <option key={c._id} value={c.name}>{c.name}</option>)}
                  <option value="__new__">+ Add new category</option>
                </select>
              </div>
              {candForm.category === '__new__' && (
                <div className="form-group">
                  <label>New Category Name</label>
                  <input type="text" placeholder="e.g. Best Dressed" value={candForm.newCategory}
                    onChange={e => setCandForm(f => ({ ...f, newCategory: e.target.value }))} />
                </div>
              )}
              <div className="form-group">
                <label>Photo</label>
                <input type="file" accept="image/*" onChange={handleImageChange} style={{ color: '#9A9488', fontSize: 13 }} />
                {imagePreview && (
                  <img src={imagePreview} alt="preview" style={{ width: '100%', borderRadius: 8, marginTop: 10, maxHeight: 160, objectFit: 'cover' }} />
                )}
              </div>
              <button type="submit" className="btn btn-gold" style={{ width: '100%', justifyContent: 'center' }}>
                Add Candidate
              </button>
            </form>
          </div>

          <div>
            <h3 style={{ marginBottom: 6, fontSize: 17 }}>All Candidates ({candidates.length})</h3>
            <p style={{ color: '#9A9488', fontSize: 13, marginBottom: 16 }}>
              Click <strong style={{ color: '#C9A84C' }}>Update Photo</strong> to fix missing pictures
            </p>
            {candidates.length === 0 ? (
              <div style={{ color: '#9A9488', padding: 40, textAlign: 'center' }}>No candidates yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {candidates.map(c => (
                  <div key={c._id} style={{
                    background: '#161616',
                    border: `1px solid ${c.image && c.image.includes('cloudinary') ? '#2A2A2A' : 'rgba(232,168,58,0.25)'}`,
                    borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 14,
                  }}>
                    {c.image && c.image.includes('cloudinary') ? (
                      <img src={c.image} alt={c.name} style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                      <div style={{
                        width: 44, height: 44, borderRadius: '50%', background: 'rgba(232,168,58,0.1)',
                        border: '1px solid rgba(232,168,58,0.3)', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: 18, flexShrink: 0,
                      }}>⚠️</div>
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</div>
                      <div style={{ fontSize: 12, color: '#9A9488' }}>{c.category} · {c.votes} votes</div>
                      {!c.image || !c.image.includes('cloudinary') ? (
                        <div style={{ fontSize: 11, color: '#E8A83A', marginTop: 2 }}>⚠ Photo missing</div>
                      ) : (
                        <div style={{ fontSize: 11, color: '#4CAF7E', marginTop: 2 }}>✓ Photo OK</div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      <button onClick={() => triggerPhotoUpdate(c._id)} style={{
                        padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                        background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.4)',
                        color: '#C9A84C', cursor: 'pointer',
                      }}>
                        📷 Update Photo
                      </button>
                      <button className="btn btn-danger" style={{ fontSize: 12, padding: '6px 12px' }}
                        onClick={() => deleteCandidate(c._id)}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CATEGORIES TAB ─────────────────────── */}
      {tab === 'categories' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 32, alignItems: 'start' }}>
          <div style={{ background: '#161616', border: '1px solid #2A2A2A', borderRadius: 12, padding: 24 }}>
            <h3 style={{ marginBottom: 20, fontSize: 17 }}>Add Category</h3>
            <form onSubmit={addCategory}>
              <div className="form-group">
                <label>Category Name</label>
                <input type="text" placeholder="e.g. Best Dressed" value={catName}
                  onChange={e => setCatName(e.target.value)} />
              </div>
              <button type="submit" className="btn btn-gold" style={{ width: '100%', justifyContent: 'center' }}>
                Add Category
              </button>
            </form>
          </div>
          <div>
            <h3 style={{ marginBottom: 16, fontSize: 17 }}>All Categories ({categories.length})</h3>
            {categories.length === 0 ? (
              <div style={{ color: '#9A9488', padding: 40, textAlign: 'center' }}>No categories yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {categories.map(c => (
                  <div key={c._id} style={{
                    background: '#161616', border: '1px solid #2A2A2A', borderRadius: 10,
                    padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <span style={{ fontWeight: 600 }}>{c.name}</span>
                    <button className="btn btn-danger" style={{ fontSize: 12, padding: '6px 12px' }}
                      onClick={() => deleteCategory(c._id)}>Delete</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}