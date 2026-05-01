import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../api/client';
import { User as UserIcon, Mail, Shield, Bell, Send, CheckCircle, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const Profile = () => {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Form State
  const [telegramId, setTelegramId] = useState('');
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyTelegram, setNotifyTelegram] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await apiClient.get('/auth/me');
      if (res.data?.user) {
        const u = res.data.user;
        setProfile(u);
        setTelegramId(u.telegramId || '');
        setNotifyEmail(u.notificationPreferences?.email ?? true);
        setNotifyTelegram(u.notificationPreferences?.telegram ?? false);
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to load profile details.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const res = await apiClient.put('/auth/update-profile', {
        telegramId,
        notificationPreferences: {
          email: notifyEmail,
          telegram: notifyTelegram
        }
      });
      if (res.data?.success) {
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
        setProfile(res.data.user);
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to update profile.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="pb-12">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-slate-900" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          My Profile
        </h1>
        <p className="text-slate-400 text-sm mt-1">Manage your account settings and notification preferences.</p>
      </div>

      {message.text && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mb-6 p-4 rounded-xl text-sm font-medium flex items-center gap-2 ${
            message.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          }`}
        >
          {message.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
          {message.text}
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Profile Details (Read Only) */}
        <div className="card md:col-span-1 border-t-4 border-t-indigo-500 h-fit">
          <div className="flex flex-col items-center text-center pb-6 border-b border-slate-100">
            <div className="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center mb-4">
              <span className="text-3xl font-bold text-indigo-600">
                {profile?.fullname?.[0]?.toUpperCase() || 'U'}
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900">{profile?.fullname}</h2>
            <div className="text-sm text-slate-500 mb-2">{profile?.email}</div>
            
            <div className="flex gap-2 justify-center mt-2">
              <span className="badge badge-basic">{profile?.role}</span>
              <span className="badge badge-pro">{profile?.plan} plan</span>
            </div>
          </div>

          <div className="pt-6 space-y-4">
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <Shield size={16} className="text-emerald-500" />
              <span>Email Verified: <strong>{profile?.isVerified ? 'Yes' : 'No'}</strong></span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <UserIcon size={16} className="text-slate-400" />
              <span>Member since: {new Date(profile?.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t border-slate-100">
            <button onClick={logout} className="btn btn-danger w-full">Logout</button>
          </div>
        </div>

        {/* Preferences Form */}
        <div className="card md:col-span-2">
          <h3 className="text-lg font-bold text-slate-900 mb-5 flex items-center gap-2">
            <Bell size={18} className="text-indigo-500" />
            Alerts & Notifications
          </h3>
          
          <form onSubmit={handleSave}>
            <div className="space-y-6">
              
              {/* Telegram ID */}
              <div>
                <label className="form-label flex items-center gap-1.5">
                  <Send size={14} className="text-blue-500" /> Telegram Chat ID
                </label>
                <input
                  type="text"
                  className="form-input max-w-md"
                  placeholder="e.g. 123456789"
                  value={telegramId}
                  onChange={(e) => setTelegramId(e.target.value)}
                />
                <p className="text-xs text-slate-400 mt-1.5">
                  Start a chat with our bot <strong>@NaradaAIBot</strong> and send `/start` to get your Chat ID.
                </p>
              </div>

              <hr className="border-slate-100" />

              {/* Notification Toggles */}
              <div>
                <h4 className="text-sm font-semibold text-slate-800 mb-3">Where should we send downtime alerts?</h4>
                
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-indigo-600 rounded"
                      checked={notifyEmail}
                      onChange={(e) => setNotifyEmail(e.target.checked)}
                    />
                    <div>
                      <div className="text-sm font-medium text-slate-900 flex items-center gap-1.5">
                        <Mail size={14} className="text-slate-500" /> Email Alerts
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">Send alerts to {profile?.email}</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-blue-500 rounded"
                      checked={notifyTelegram}
                      onChange={(e) => setNotifyTelegram(e.target.checked)}
                    />
                    <div>
                      <div className="text-sm font-medium text-slate-900 flex items-center gap-1.5">
                        <Send size={14} className="text-blue-500" /> Telegram Alerts
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">Instant messages to your Telegram app</div>
                    </div>
                  </label>
                </div>
              </div>

            </div>

            <div className="mt-8 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="btn btn-primary px-6"
              >
                {saving ? (
                  <><span className="spinner !w-4 !h-4 !border-2 !border-white/30 !border-t-white" /> Saving...</>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
};

export default Profile;
