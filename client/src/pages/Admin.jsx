import { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { useSearchParams } from 'react-router-dom';

const Admin = () => {
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'pending'; // pending, payments, users, coupons, settings

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Approve/Reject Modal State
  const [actionModal, setActionModal] = useState({ isOpen: false, type: '', payment: null, note: '' });

  // Coupon State
  const [newCoupon, setNewCoupon] = useState({ code: '', type: 'percentage', value: '', maxUses: 0, validUntil: '' });
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);

  // Settings State
  const [settings, setSettings] = useState({});

  // User State
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userFormData, setUserFormData] = useState({ name: '', email: '', password: '', role: 'USER', planType: 'FREE' });
  const [generatedPassword, setGeneratedPassword] = useState('');

  // Email Templates State
  const [emailTemplatesData, setEmailTemplatesData] = useState(null);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateFormData, setTemplateFormData] = useState({ subject: '', html: '' });
  const [templatePreview, setTemplatePreview] = useState(null); // { subject, html }
  const [testEmail, setTestEmail] = useState('');

  // Filter State (for Payments tab)
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // Filter Logic
  const getFilteredPayments = () => {
    if (!data || activeTab !== 'payments') return data;
    return data.filter(p => {
      // Status Match
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      
      // Search Match (Email, Name, UTR)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const email = p.userId?.email?.toLowerCase() || '';
        const name = p.userId?.name?.toLowerCase() || '';
        const utr = p.utrNumber?.toLowerCase() || '';
        if (!email.includes(query) && !name.includes(query) && !utr.includes(query)) return false;
      }

      // Date Range Match
      if (dateRange.start) {
        if (new Date(p.createdAt) < new Date(dateRange.start)) return false;
      }
      if (dateRange.end) {
        const endDate = new Date(dateRange.end);
        endDate.setHours(23, 59, 59, 999);
        if (new Date(p.createdAt) > endDate) return false;
      }

      return true;
    });
  };

  const filteredData = getFilteredPayments();

  const handleExportCSV = () => {
    if (!filteredData || filteredData.length === 0) return alert('No data to export');
    
    const headers = ['User Name', 'Email', 'Plan', 'Amount', 'UTR', 'Status', 'Date'];
    const csvRows = [headers.join(',')];

    filteredData.forEach(p => {
      const row = [
        `"${p.userId?.name || ''}"`,
        `"${p.userId?.email || ''}"`,
        p.plan.toUpperCase(),
        p.finalAmount,
        `"${p.utrNumber || ''}"`,
        p.status.toUpperCase(),
        new Date(p.createdAt).toLocaleDateString()
      ];
      csvRows.push(row.join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payments_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'pending') {
        const res = await apiClient.get('/admin/payments/pending');
        setData(res.data || []);
      } else if (activeTab === 'payments') {
        const res = await apiClient.get('/admin/payments');
        setData(res.data || []);
      } else if (activeTab === 'users') {
        const res = await apiClient.get('/admin/users');
        setData(res.data || []);
      } else if (activeTab === 'settings') {
        const res = await apiClient.get('/admin/settings');
        // settings comes back as an array from DB; convert to single object for easy access
        const settingsArr = res.data || [];
        const settingsObj = settingsArr.length > 0 ? settingsArr[0] : {};
        setSettings(settingsObj);
      } else if (activeTab === 'coupons') {
        const res = await apiClient.get('/admin/coupons');
        setData(res.data || []);
      } else if (activeTab === 'email-templates') {
        const res = await apiClient.get('/admin/email-templates');
        setEmailTemplatesData(res.data); // It returns { total, grouped: { auth, billing, monitoring } }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post(`/admin/payments/${actionModal.payment._id}/${actionModal.type}`, {
        adminNote: actionModal.note
      });
      setActionModal({ isOpen: false, type: '', payment: null, note: '' });
      fetchData();
    } catch (err) {
      alert(err.message || 'Action failed');
    }
  };

  const handleCreateCoupon = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post('/admin/coupons', {
        code: newCoupon.code,
        discountType: newCoupon.type,
        discountValue: parseFloat(newCoupon.value),
        maxUses: parseInt(newCoupon.maxUses) || 0,
        validUntil: newCoupon.validUntil ? new Date(newCoupon.validUntil).toISOString() : null
      });
      alert('Coupon created successfully!');
      setNewCoupon({ code: '', type: 'percentage', value: '', maxUses: 0, validUntil: '' });
      setIsCouponModalOpen(false);
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to create coupon');
    }
  };

  const handleDeleteCoupon = async (id) => {
    if (!window.confirm('Are you sure you want to delete this coupon?')) return;
    try {
      await apiClient.delete(`/admin/coupons/${id}`);
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to delete coupon');
    }
  };

  const handleSaveSettings = async (updates) => {
    try {
      await apiClient.put('/admin/settings', updates);
      alert('Settings saved!');
    } catch (err) {
      alert(err.message || 'Failed to save settings');
    }
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        // Update user (don't send password if empty)
        const payload = { ...userFormData };
        if (!payload.password) delete payload.password;
        await apiClient.put(`/admin/users/${editingUser._id}`, payload);
        alert('User updated successfully');
        setIsUserModalOpen(false);
      } else {
        // Create new user
        const res = await apiClient.post('/admin/users', userFormData);
        setGeneratedPassword(res.data.generatedPassword || userFormData.password);
        alert('User created successfully');
        // Do not close modal yet, so admin can see the generated password
      }
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to save user');
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user? ALL THEIR MONITORS AND LOGS WILL BE PERMANENTLY DELETED.')) return;
    try {
      await apiClient.delete(`/admin/users/${id}`);
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to delete user');
    }
  };

  const openUserModal = (user = null) => {
    setGeneratedPassword('');
    if (user) {
      setEditingUser(user);
      setUserFormData({
        name: user.name,
        email: user.email,
        password: '',
        role: user.role,
        planType: user.plan?.type || 'FREE'
      });
    } else {
      setEditingUser(null);
      setUserFormData({ name: '', email: '', password: '', role: 'USER', planType: 'FREE' });
    }
    setIsUserModalOpen(true);
  };

  // --- Email Template Handlers ---
  const handleEditTemplate = async (template) => {
    try {
      const res = await apiClient.get(`/admin/email-templates/${template.key}`);
      const fullTemplate = res.data.template;
      setEditingTemplate(fullTemplate);
      setTemplateFormData({ subject: fullTemplate.subject, html: fullTemplate.html });
      setTemplatePreview(null);
      setTestEmail('');
    } catch (err) {
      alert(err.message || 'Failed to fetch template details');
    }
  };

  const handleSaveTemplate = async (e) => {
    e.preventDefault();
    try {
      await apiClient.put(`/admin/email-templates/${editingTemplate.key}`, templateFormData);
      alert('Template saved successfully!');
      setEditingTemplate(null);
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to save template');
    }
  };

  const handleResetTemplate = async () => {
    if (!window.confirm('Are you sure you want to reset this template to the system default? All custom changes will be lost.')) return;
    try {
      await apiClient.post(`/admin/email-templates/${editingTemplate.key}/reset`);
      alert('Template reset to default!');
      setEditingTemplate(null);
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to reset template');
    }
  };

  const handlePreviewTemplate = async () => {
    try {
      const res = await apiClient.post(`/admin/email-templates/${editingTemplate.key}/preview`);
      setTemplatePreview(res.data);
    } catch (err) {
      alert(err.message || 'Failed to load preview');
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmail) return alert('Please enter a test email address.');
    try {
      await apiClient.post('/admin/email-templates/test', {
        key: editingTemplate.key,
        to: testEmail
      });
      alert('Test email sent successfully! Please check your inbox.');
    } catch (err) {
      alert(err.message || 'Failed to send test email');
    }
  };

  if (loading) return <div className="p-10 text-center"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold capitalize">{activeTab.replace('-', ' ')}</h1>
      </div>

      {activeTab === 'pending' && (
        <div className="card !p-0 overflow-hidden">
          <div className="table-wrap">
            <table className="w-full text-left">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Plan</th>
                  <th>Amount</th>
                  <th>UTR</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data?.length === 0 && <tr><td colSpan="6" className="text-center py-8">No pending payments</td></tr>}
                {data?.map(p => (
                  <tr key={p._id}>
                    <td>
                      <div className="font-medium">{p.user?.name || p.userId?.name || 'N/A'}</div>
                      <div className="text-xs text-slate-400">{p.user?.email || p.userId?.email}</div>
                    </td>
                    <td><span className={`badge badge-${p.plan}`}>{p.plan?.toUpperCase()}</span></td>
                    <td className="font-bold">₹{p.finalAmount || p.amount}</td>
                    <td className="font-mono text-sm">{p.utrNumber || p.utr}</td>
                    <td className="text-sm text-slate-400">{new Date(p.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className="flex gap-2">
                        <button className="btn btn-success btn-sm" onClick={() => setActionModal({ isOpen: true, type: 'approve', payment: p, note: '' })}>✅ Approve</button>
                        <button className="btn btn-danger btn-sm" onClick={() => setActionModal({ isOpen: true, type: 'reject', payment: p, note: '' })}>❌ Reject</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'payments' && (
        <div className="card !p-0 overflow-hidden">
          {/* Filters Section */}
          <div className="p-4 bg-white border-b border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Search (Name/Email/UTR)</label>
              <input type="text" className="form-input text-sm py-1.5" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Status</label>
              <select className="form-input text-sm py-1.5" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="active">Approved (Active)</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Date Range</label>
              <div className="flex gap-2">
                <input type="date" className="form-input text-sm py-1.5 flex-1" value={dateRange.start} onChange={(e) => setDateRange({...dateRange, start: e.target.value})} />
                <input type="date" className="form-input text-sm py-1.5 flex-1" value={dateRange.end} onChange={(e) => setDateRange({...dateRange, end: e.target.value})} />
              </div>
            </div>
            <div className="flex justify-end">
              <button className="btn btn-secondary text-sm py-1.5 px-4 w-full md:w-auto" onClick={handleExportCSV}>
                📥 Export CSV
              </button>
            </div>
          </div>

          <div className="table-wrap">
            <table className="w-full text-left">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Plan</th>
                  <th>Amount</th>
                  <th>UTR</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredData?.length === 0 && <tr><td colSpan="7" className="text-center py-8">No payments match your filters</td></tr>}
                {filteredData?.map(p => (
                  <tr key={p._id}>
                    <td>
                      <div className="font-medium">{p.user?.name || p.userId?.name || 'N/A'}</div>
                      <div className="text-xs text-slate-400">{p.user?.email || p.userId?.email}</div>
                    </td>
                    <td><span className={`badge badge-${p.plan}`}>{p.plan?.toUpperCase()}</span></td>
                    <td className="font-bold">₹{p.finalAmount || p.amount}</td>
                    <td className="font-mono text-sm">{p.utrNumber || p.utr}</td>
                    <td><span className={`badge badge-${p.status === 'active' ? 'approved' : p.status}`}>{p.status?.toUpperCase()}</span></td>
                    <td className="text-sm text-slate-400">{new Date(p.createdAt).toLocaleDateString()}</td>
                    <td>
                      {p.status === 'pending' && (
                        <div className="flex gap-2">
                          <button className="btn btn-success btn-sm !py-1 !px-2 !text-xs" onClick={() => setActionModal({ isOpen: true, type: 'approve', payment: p, note: '' })}>Approve</button>
                          <button className="btn btn-danger btn-sm !py-1 !px-2 !text-xs" onClick={() => setActionModal({ isOpen: true, type: 'reject', payment: p, note: '' })}>Reject</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="card !p-0 overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-white">
            <h2 className="text-lg font-bold">Manage Users</h2>
            <button className="btn btn-primary btn-sm" onClick={() => openUserModal()}>+ Add User</button>
          </div>
          <div className="table-wrap">
            <table className="w-full text-left">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Plan</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data?.map(u => (
                  <tr key={u._id}>
                    <td className="font-medium">{u.name}</td>
                    <td className="text-slate-400">{u.email}</td>
                    <td><span className={`badge ${u.role === 'ADMIN' ? 'badge-elite' : 'badge-free'}`}>{u.role}</span></td>
                    <td><span className={`badge badge-${(u.plan?.type || 'FREE').toLowerCase()}`}>{(u.plan?.type || 'FREE').toUpperCase()}</span></td>
                    <td className="text-sm text-slate-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className="flex gap-3">
                        <button className="text-blue-500 hover:text-blue-700 font-medium text-sm" onClick={() => openUserModal(u)}>Edit</button>
                        <button className="text-red-500 hover:text-red-700 font-medium text-sm" onClick={() => handleDeleteUser(u._id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'coupons' && (
        <div className="card !p-0 overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-white">
            <h2 className="text-lg font-bold">Manage Coupons</h2>
            <button className="btn btn-primary btn-sm" onClick={() => setIsCouponModalOpen(true)}>+ Add Coupon</button>
          </div>
          <div className="table-wrap">
            <table className="w-full text-left">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Discount</th>
                  <th>Uses</th>
                  <th>Valid Until</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data?.length === 0 && <tr><td colSpan="6" className="text-center py-8">No coupons found</td></tr>}
                {data?.map(c => (
                  <tr key={c._id}>
                    <td className="font-mono font-bold">{c.code}</td>
                    <td>{c.discountType === 'percentage' ? `${c.discountValue}%` : `₹${c.discountValue}`}</td>
                    <td className="text-sm">
                      <span className="font-bold">{c.usedCount}</span> / {c.maxUses === 0 ? '∞' : c.maxUses}
                    </td>
                    <td className="text-sm text-slate-500">
                      {c.validUntil ? new Date(c.validUntil).toLocaleDateString() : 'Never'}
                    </td>
                    <td>
                      <span className={`badge ${c.isActive ? 'badge-approved' : 'badge-rejected'}`}>
                        {c.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    <td>
                      <button className="text-red-500 hover:text-red-700 text-sm font-medium" onClick={() => handleDeleteCoupon(c._id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="font-bold mb-4">AI / Gemini</h3>
            <input type="password" placeholder="Gemini API Key" className="form-input mb-3" defaultValue={settings?.geminiApiKey} id="s-gemini" />
            <button className="btn btn-primary btn-sm" onClick={() => handleSaveSettings({ geminiApiKey: document.getElementById('s-gemini').value })}>Save AI Settings</button>
          </div>
          <div className="card">
            <h3 className="font-bold mb-4">UPI Payment</h3>
            <input type="text" placeholder="UPI ID" className="form-input mb-3" defaultValue={settings?.upiId} id="s-upi" />
            <input type="text" placeholder="Payee Name" className="form-input mb-3" defaultValue={settings?.upiPayeeName} id="s-payee" />
            <button className="btn btn-primary btn-sm" onClick={() => handleSaveSettings({ upiId: document.getElementById('s-upi').value, upiPayeeName: document.getElementById('s-payee').value })}>Save UPI Settings</button>
          </div>
        </div>
      )}
      {activeTab === 'email-templates' && emailTemplatesData && (
        <div className="space-y-8">
          {Object.entries(emailTemplatesData.grouped).map(([category, templates]) => (
            <div key={category} className="card !p-0 overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold capitalize text-slate-700 flex justify-between items-center">
                {category} Templates
              </div>
              <div className="table-wrap">
                <table className="w-full text-left">
                  <thead>
                    <tr>
                      <th>Template Key</th>
                      <th>Subject</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {templates.map(t => (
                      <tr key={t.key}>
                        <td className="font-mono text-sm font-semibold">{t.key}</td>
                        <td className="text-slate-600 truncate max-w-xs" title={t.subject}>{t.subject}</td>
                        <td>
                          {t.isCustom ? (
                            <span className="badge bg-blue-100 text-blue-800">Customized</span>
                          ) : (
                            <span className="badge bg-slate-100 text-slate-600">Default</span>
                          )}
                        </td>
                        <td>
                          <button onClick={() => handleEditTemplate(t)} className="text-blue-600 font-medium hover:underline">Edit</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Email Template Editor Modal */}
      {editingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <h2 className="text-xl font-bold">Edit Template: {editingTemplate.key}</h2>
              <button onClick={() => setEditingTemplate(null)} className="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 flex flex-col lg:flex-row gap-6">
              {/* Editor Side */}
              <div className="flex-1 space-y-4">
                <form id="template-form" onSubmit={handleSaveTemplate} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={templateFormData.subject} 
                      onChange={e => setTemplateFormData({...templateFormData, subject: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1 flex justify-between">
                      <span>HTML Body</span>
                      <span className="text-xs text-blue-600 font-semibold cursor-pointer hover:underline" onClick={handlePreviewTemplate}>Preview Render</span>
                    </label>
                    <textarea 
                      className="form-input font-mono text-xs h-64" 
                      value={templateFormData.html} 
                      onChange={e => setTemplateFormData({...templateFormData, html: e.target.value})}
                      required
                    ></textarea>
                  </div>
                </form>

                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <h4 className="text-sm font-bold text-blue-800 mb-2">Available Variables</h4>
                  <div className="flex flex-wrap gap-2">
                    {editingTemplate.variables.map(v => (
                      <span key={v} className="text-xs font-mono bg-white px-2 py-1 rounded border border-blue-200 text-blue-700">
                        {`{{${v}}}`}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-blue-600 mt-2">Click to copy variables and paste them in your HTML or subject line.</p>
                </div>
              </div>

              {/* Preview Side */}
              <div className="w-full lg:w-[450px] flex flex-col gap-4">
                <div className="card !p-4 bg-slate-50 border-slate-200 flex-1 flex flex-col">
                  <h3 className="font-bold text-slate-700 mb-2 text-sm">Live Preview</h3>
                  {templatePreview ? (
                    <div className="flex-1 border border-slate-200 bg-white rounded-lg overflow-hidden flex flex-col">
                      <div className="bg-slate-100 p-3 border-b border-slate-200 text-sm">
                        <span className="font-bold">Subject:</span> {templatePreview.data.subject}
                      </div>
                      <div className="p-4 flex-1 overflow-y-auto">
                        <div dangerouslySetInnerHTML={{ __html: templatePreview.data.html }} />
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 border border-dashed border-slate-300 rounded-lg flex items-center justify-center text-slate-400 text-sm">
                      Click "Preview Render" to see how it looks.
                    </div>
                  )}
                </div>

                <div className="card !p-4 bg-slate-50 border-slate-200">
                  <h3 className="font-bold text-slate-700 mb-2 text-sm">Send Test Email</h3>
                  <div className="flex gap-2">
                    <input 
                      type="email" 
                      placeholder="Enter email..." 
                      className="form-input text-sm"
                      value={testEmail}
                      onChange={e => setTestEmail(e.target.value)}
                    />
                    <button type="button" onClick={handleSendTestEmail} className="btn btn-secondary text-sm whitespace-nowrap">
                      Send Test
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 flex justify-between bg-slate-50">
              <button 
                type="button"
                onClick={handleResetTemplate}
                className="btn text-red-600 hover:bg-red-50 border-transparent bg-transparent"
              >
                Reset to Default
              </button>
              <div className="flex gap-3">
                <button type="button" onClick={() => setEditingTemplate(null)} className="btn btn-secondary">Cancel</button>
                <button type="submit" form="template-form" className="btn btn-primary">Save Template</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* User Modal */}
      {isUserModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content !max-w-md">
            <h2 className="text-xl font-bold mb-4">{editingUser ? 'Edit User' : 'Create New User'}</h2>
            
            {generatedPassword && (
              <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded-lg mb-4 text-sm">
                <strong>User Created!</strong><br />
                Password: <code className="font-bold select-all bg-white px-2 py-1 rounded">{generatedPassword}</code><br/>
                <span className="text-xs">Please copy and send this password to the user.</span>
              </div>
            )}

            <form onSubmit={handleSaveUser} className="flex flex-col gap-4">
              <div>
                <label className="form-label">Full Name</label>
                <input type="text" required className="form-input" value={userFormData.name} onChange={e => setUserFormData({...userFormData, name: e.target.value})} placeholder="John Doe" />
              </div>
              <div>
                <label className="form-label">Email Address</label>
                <input type="email" required className="form-input" value={userFormData.email} onChange={e => setUserFormData({...userFormData, email: e.target.value})} placeholder="john@example.com" />
              </div>
              <div>
                <label className="form-label">Password {editingUser && <span className="text-xs font-normal text-slate-400">(leave blank to keep current)</span>}</label>
                <input type="text" minLength={6} required={!editingUser} className="form-input" value={userFormData.password} onChange={e => setUserFormData({...userFormData, password: e.target.value})} placeholder={editingUser ? "Leave blank to ignore" : "Min 6 chars"} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Role</label>
                  <select className="form-input" value={userFormData.role} onChange={e => setUserFormData({...userFormData, role: e.target.value})}>
                    <option value="USER">USER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Plan Type</label>
                  <select className="form-input" value={userFormData.planType} onChange={e => setUserFormData({...userFormData, planType: e.target.value})}>
                    <option value="FREE">FREE (3 Sites)</option>
                    <option value="BASIC">BASIC (20 Sites)</option>
                    <option value="PRO">PRO (100 Sites)</option>
                    <option value="ENTERPRISE">ENTERPRISE (500 Sites)</option>
                  </select>
                </div>
              </div>
              
              <div className="flex gap-3 mt-4">
                <button type="button" className="btn btn-secondary flex-1" onClick={() => setIsUserModalOpen(false)}>
                  {generatedPassword ? 'Close' : 'Cancel'}
                </button>
                {!generatedPassword && (
                  <button type="submit" className="btn btn-primary flex-1">{editingUser ? 'Save Changes' : 'Create User'}</button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Coupon Modal */}
      {isCouponModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content !max-w-md">
            <h2 className="text-xl font-bold mb-4">Create New Coupon</h2>
            <form onSubmit={handleCreateCoupon} className="flex flex-col gap-4">
              <div>
                <label className="form-label">Coupon Code</label>
                <input type="text" required className="form-input uppercase" value={newCoupon.code} onChange={e => setNewCoupon({...newCoupon, code: e.target.value.toUpperCase()})} placeholder="SAVE20" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Type</label>
                  <select className="form-input" value={newCoupon.type} onChange={e => setNewCoupon({...newCoupon, type: e.target.value})}>
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Value</label>
                  <input type="number" required className="form-input" value={newCoupon.value} onChange={e => setNewCoupon({...newCoupon, value: e.target.value})} placeholder="20" />
                </div>
              </div>
              <div>
                <label className="form-label">Max Uses (0 = unlimited)</label>
                <input type="number" className="form-input" value={newCoupon.maxUses} onChange={e => setNewCoupon({...newCoupon, maxUses: e.target.value})} />
              </div>
              <div>
                <label className="form-label">Valid Until (optional)</label>
                <input type="date" className="form-input" value={newCoupon.validUntil} onChange={e => setNewCoupon({...newCoupon, validUntil: e.target.value})} />
              </div>
              <div className="flex gap-3 mt-4">
                <button type="button" className="btn btn-secondary flex-1" onClick={() => setIsCouponModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary flex-1">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Action Modal */}
      {actionModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 className="text-xl font-bold mb-4">{actionModal.type === 'approve' ? '✅ Approve Payment' : '❌ Reject Payment'}</h2>
            <div className="bg-slate-100 p-4 rounded-lg mb-4 text-sm leading-relaxed">
              <div><strong>User:</strong> {actionModal.payment.userId?.name}</div>
              <div><strong>Plan:</strong> {actionModal.payment.plan.toUpperCase()} - ₹{actionModal.payment.finalAmount}</div>
              <div><strong>UTR:</strong> {actionModal.payment.utrNumber}</div>
            </div>
            <div className="mb-6">
              <label className="form-label">Admin Note (optional)</label>
              <input type="text" className="form-input" value={actionModal.note} onChange={e => setActionModal({...actionModal, note: e.target.value})} placeholder="e.g. Verified via UPI app" />
            </div>
            <div className="flex gap-3">
              <button className={`btn flex-1 ${actionModal.type === 'approve' ? 'btn-success' : 'btn-danger'}`} onClick={handleAction}>Confirm</button>
              <button className="btn btn-ghost flex-1" onClick={() => setActionModal({ isOpen: false, type: '', payment: null, note: '' })}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
