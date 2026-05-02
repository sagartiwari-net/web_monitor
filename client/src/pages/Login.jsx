import { useState, Suspense } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Sphere, MeshDistortMaterial, Float } from '@react-three/drei';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, Activity, Mail, Lock, ArrowRight, CheckCircle, AlertCircle, KeyRound } from 'lucide-react';

const MiniSphere = () => (
  <Float speed={1.2} rotationIntensity={0.3} floatIntensity={0.5}>
    <Sphere args={[1.6, 80, 80]} scale={1}>
      <MeshDistortMaterial
        color="#4f46e5"
        attach="material"
        distort={0.4}
        speed={1.5}
        roughness={0.2}
        metalness={0.8}
        clearcoat={1}
        clearcoatRoughness={0.1}
        opacity={0.9}
        transparent
      />
    </Sphere>
  </Float>
);

const floatingCards = [
  { emoji: '✅', text: 'toolsmandi.com is UP', sub: '42ms · 1 min ago',   className: 'top-16 left-8' },
  { emoji: '🔴', text: 'buyahref.com is DOWN', sub: 'ECONNRESET · 2m ago', className: 'top-1/2 right-4' },
  { emoji: '🛡️', text: 'SSL Certificate OK',  sub: 'Expires in 43 days',  className: 'bottom-24 left-12' },
];

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loginMethod, setLoginMethod] = useState('password'); // 'password' or 'otp'
  
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // OTP Login States
  const [loginOtp, setLoginOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  
  // Forgot Password States
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  
  // Reset Password States
  const [showReset, setShowReset] = useState(false);
  const [resetOtp, setResetOtp] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestLoginOtp = async (e) => {
    e.preventDefault();
    setError('');
    setOtpLoading(true);
    try {
      const { default: apiClient } = await import('../api/client');
      await apiClient.post('/auth/login-otp/request', { email: form.email });
      setOtpSent(true);
    } catch (err) {
      setError(err.message || 'Failed to send OTP.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyLoginOtp = async (e) => {
    e.preventDefault();
    setError('');
    setOtpLoading(true);
    try {
      const { default: apiClient } = await import('../api/client');
      const res = await apiClient.post('/auth/login-otp/verify', { email: form.email, otp: loginOtp });
      
      // Manually set token and user in context/localStorage
      localStorage.setItem('wm_token', res.token);
      localStorage.setItem('wm_user', JSON.stringify(res.user));
      // Reload page to re-initialize auth state correctly
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err.message || 'Invalid OTP.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotLoading(true);
    try {
      const { default: apiClient } = await import('../api/client');
      await apiClient.post('/auth/forgot-password', { email: forgotEmail });
      setShowForgot(false);
      setShowReset(true);
    } catch (err) {
      setForgotError(err.message || 'Failed to send OTP.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setResetError('');
    setResetLoading(true);
    try {
      const { default: apiClient } = await import('../api/client');
      await apiClient.post('/auth/reset-password', {
        email: forgotEmail,
        otp: resetOtp,
        newPassword: resetPassword
      });
      setResetSuccess('Password reset successfully! Please log in.');
      setTimeout(() => {
        setShowReset(false);
        setForm({ ...form, email: forgotEmail });
        setResetSuccess('');
      }, 2500);
    } catch (err) {
      setResetError(err.message || 'Invalid OTP or failed to reset.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex">

      {/* ── Left: Form Panel ───────────────────────────────────────── */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 lg:px-16">
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55 }}
          className="w-full max-w-md"
        >
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 no-underline mb-10">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Activity size={16} className="text-white" />
            </div>
            <span className="font-extrabold text-slate-900 text-lg" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Narada <span className="text-indigo-600">Ai</span>
            </span>
          </Link>

          <h1 className="text-3xl font-extrabold text-slate-900 mb-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Welcome back
          </h1>
          <p className="text-slate-500 mb-8">Welcome back! Please enter your details.</p>

          {/* Success Message from Redirects */}
          {location.state?.message && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-4 py-3 rounded-xl mb-5 flex items-center gap-2">
              <CheckCircle size={16} className="flex-shrink-0" /> {location.state.message}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-5 flex items-center gap-2">
              <AlertCircle size={16} className="flex-shrink-0" /> {error}
            </div>
          )}

          {/* Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
            <button
              onClick={() => { setLoginMethod('password'); setOtpSent(false); setError(''); }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${loginMethod === 'password' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Password
            </button>
            <button
              onClick={() => { setLoginMethod('otp'); setError(''); }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${loginMethod === 'otp' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Email OTP
            </button>
          </div>

          {loginMethod === 'password' ? (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Email */}
              <div>
                <label className="form-label">Email Address</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="login-email"
                    type="email"
                    required
                    className="form-input !pl-10"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between mt-1 mb-2">
                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                  <input type="checkbox" className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                  Remember me
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgot(true)}
                  className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                >
                  Forgot password?
                </button>
              </div>

              {/* Password */}
              <div>
                <label className="form-label">Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    className="form-input !pl-10 !pr-10"
                    placeholder="Min 6 characters"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label="Toggle password"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                id="login-submit"
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full btn-lg mt-1"
              >
                {loading ? (
                  <><span className="spinner !w-4 !h-4 !border-2 !border-white/30 !border-t-white" /> Signing in...</>
                ) : (
                  <>Sign In <ArrowRight size={16} /></>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={otpSent ? handleVerifyLoginOtp : handleRequestLoginOtp} className="flex flex-col gap-4">
              <div>
                <label className="form-label">Email Address</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="login-email-otp"
                    type="email"
                    required
                    disabled={otpSent}
                    className={`form-input !pl-10 ${otpSent ? 'bg-slate-50 text-slate-500' : ''}`}
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
              </div>

              {otpSent && (
                <div>
                  <label className="form-label flex justify-between">
                    <span>Enter 6-digit OTP</span>
                    <button 
                      type="button" 
                      onClick={() => setOtpSent(false)} 
                      className="text-xs text-indigo-600 hover:underline"
                    >
                      Change Email
                    </button>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    className="form-input text-center text-xl tracking-[0.5em] font-bold"
                    placeholder="••••••"
                    value={loginOtp}
                    onChange={(e) => setLoginOtp(e.target.value.replace(/\D/g, ''))}
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={otpLoading || (otpSent && loginOtp.length !== 6)}
                className="btn btn-primary w-full btn-lg mt-2"
              >
                {otpLoading ? (
                  <><span className="spinner !w-4 !h-4 !border-2 !border-white/30 !border-t-white" /> Processing...</>
                ) : (
                  otpSent ? <>Verify & Login <ArrowRight size={16} /></> : 'Send Login Code'
                )}
              </button>
            </form>
          )}

          <p className="text-center text-sm text-slate-500 mt-7">
            Don't have an account?{' '}
            <Link to="/signup" className="text-indigo-600 font-semibold hover:underline">
              Create one free →
            </Link>
          </p>
        </motion.div>
      </div>

      {/* ── Forgot Password Modal ──────────────────────────────────── */}
      {showForgot && (
        <div className="modal-overlay">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="modal-content">
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <KeyRound size={24} className="text-indigo-500" />
              </div>
              <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Forgot Password</h2>
              <p className="text-sm text-slate-500 mt-2">Enter your email and we'll send you an OTP to reset your password.</p>
            </div>
            {forgotError && (
              <div className="bg-red-50 text-red-700 text-sm p-3 rounded-xl mb-4 border border-red-200">
                {forgotError}
              </div>
            )}
            <form onSubmit={handleForgotPassword}>
              <div className="mb-5">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  required
                  className="form-input"
                  placeholder="name@company.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowForgot(false)} className="btn btn-secondary w-full">Cancel</button>
                <button type="submit" disabled={forgotLoading} className="btn btn-primary w-full">
                  {forgotLoading ? 'Sending...' : 'Send OTP'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* ── Reset Password Modal ───────────────────────────────────── */}
      {showReset && (
        <div className="modal-overlay">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="modal-content">
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={24} className="text-emerald-500" />
              </div>
              <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Enter OTP</h2>
              <p className="text-sm text-slate-500 mt-2">OTP sent to <strong>{forgotEmail}</strong></p>
            </div>
            
            {resetSuccess && (
              <div className="bg-emerald-50 text-emerald-700 text-sm p-3 rounded-xl mb-4 border border-emerald-200 text-center font-medium">
                {resetSuccess}
              </div>
            )}
            {resetError && (
              <div className="bg-red-50 text-red-700 text-sm p-3 rounded-xl mb-4 border border-red-200">
                {resetError}
              </div>
            )}

            {!resetSuccess && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="form-label text-center">6-Digit OTP</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    className="form-input text-center text-2xl tracking-[0.5em] font-bold py-2"
                    value={resetOtp}
                    onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, ''))}
                  />
                </div>
                <div>
                  <label className="form-label">New Password</label>
                  <input
                    type="password"
                    required
                    className="form-input"
                    placeholder="Min 6 characters"
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowReset(false)} className="btn btn-secondary w-full">Cancel</button>
                  <button type="submit" disabled={resetLoading || resetOtp.length !== 6} className="btn btn-primary w-full">
                    {resetLoading ? 'Resetting...' : 'Reset Password'}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}

      {/* ── Right: Visual Panel ────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="hidden lg:flex flex-1 bg-gradient-to-br from-indigo-700 via-indigo-600 to-cyan-600 relative overflow-hidden items-center justify-center"
      >
        {/* Pattern overlay */}
        <div
          className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '28px 28px' }}
        />

        {/* Globe */}
        <div className="w-80 h-80 relative z-10">
          <Suspense fallback={null}>
            <Canvas camera={{ position: [0, 0, 4], fov: 45 }}>
              <ambientLight intensity={0.8} />
              <directionalLight position={[5, 10, 5]} intensity={1.5} color="#ffffff" />
              <directionalLight position={[-5, -10, -5]} intensity={1} color="#6366f1" />
              <pointLight position={[10, 10, 10]} intensity={1.5} color="#fff" />
              <MiniSphere />
              <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={1.2} />
            </Canvas>
          </Suspense>
        </div>

        {/* Floating monitor cards */}
        {floatingCards.map(({ emoji, text, sub, className }, i) => (
          <div
            key={i}
            className={`absolute ${className} bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-2.5 text-white`}
            style={{ animation: `float ${3 + i * 0.5}s ease-in-out ${i * 0.4}s infinite` }}
          >
            <div className="text-sm font-semibold flex items-center gap-2">
              <span>{emoji}</span> {text}
            </div>
            <div className="text-xs text-white/60 mt-0.5">{sub}</div>
          </div>
        ))}

        {/* Tagline */}
        <div className="absolute bottom-10 left-0 right-0 text-center text-white/70 text-sm px-6">
          <div className="font-bold text-white text-lg mb-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Monitor smarter, not harder
          </div>
          Narada Ai watches so you don't have to.
        </div>
      </motion.div>

    </div>
  );
};

export default Login;
