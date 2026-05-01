import { useState, Suspense } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Sphere, MeshDistortMaterial, Float } from '@react-three/drei';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, Activity, Mail, Lock, User, ArrowRight, CheckCircle, Check, X, AlertCircle } from 'lucide-react';

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

/* Password Strength Checker */
const getStrength = (password) => {
  let score = 0;
  const checks = {
    length:   password.length >= 6,
    upper:    /[A-Z]/.test(password),
    lower:    /[a-z]/.test(password),
    number:   /[0-9]/.test(password),
    special:  /[^A-Za-z0-9]/.test(password),
  };
  Object.values(checks).forEach((v) => { if (v) score++; });
  return { score, checks };
};

const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
const strengthColors = ['', '#ef4444', '#f59e0b', '#f59e0b', '#10b981', '#10b981'];

const Signup = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullname: '', email: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // OTP Modal State
  const [showOTP, setShowOTP] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');

  const { score, checks } = getStrength(form.password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      return setError('Passwords do not match.');
    }
    if (form.password.length < 6) {
      return setError('Password must be at least 6 characters.');
    }

    setLoading(true);
    try {
      const { default: apiClient } = await import('../api/client');
      await apiClient.post('/auth/register', {
        fullname: form.fullname,
        email: form.email,
        password: form.password,
      });
      setShowOTP(true);
    } catch (err) {
      setError(err.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setOtpError('');
    setOtpLoading(true);
    try {
      const { default: apiClient } = await import('../api/client');
      await apiClient.post('/auth/verify-email', {
        email: form.email,
        otp
      });
      // Verification successful
      navigate('/login', { state: { message: 'Email verified successfully! Please log in.' } });
    } catch (err) {
      setOtpError(err.message || 'Invalid or expired OTP.');
    } finally {
      setOtpLoading(false);
    }
  };

  const benifits = [
    '3 monitors on free plan',
    'Email alerts when site goes down',
    'AI-powered root-cause analysis',
    '90-day uptime history',
  ];

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
          <Link to="/" className="flex items-center gap-2 no-underline mb-8">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Activity size={16} className="text-white" />
            </div>
            <span className="font-extrabold text-slate-900 text-lg" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Narada <span className="text-indigo-600">Ai</span>
            </span>
          </Link>

          <h1 className="text-3xl font-extrabold text-slate-900 mb-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Create your account
          </h1>
          <p className="text-slate-500 mb-7">Start monitoring for free. No credit card required.</p>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-5">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Fullname */}
            <div>
              <label className="form-label">Full Name</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="signup-name"
                  type="text"
                  required
                  className="form-input pl-9"
                  placeholder="John Doe"
                  value={form.fullname}
                  onChange={(e) => setForm({ ...form, fullname: e.target.value })}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="form-label">Email Address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="signup-email"
                  type="email"
                  required
                  className="form-input pl-9"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="form-label">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  className="form-input pl-9 pr-10"
                  placeholder="Min 6 characters"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Strength bar */}
              {form.password && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className="flex-1 h-1 rounded-full transition-all duration-300"
                        style={{ background: i <= score ? strengthColors[score] : '#e2e8f0' }}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-medium" style={{ color: strengthColors[score] }}>
                    {strengthLabels[score]}
                  </span>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="form-label">Confirm Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="signup-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  className={`form-input pl-9 pr-10 ${form.confirmPassword && form.password !== form.confirmPassword ? 'border-red-400' : ''}`}
                  placeholder="Repeat your password"
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                />
                {form.confirmPassword && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2">
                    {form.password === form.confirmPassword
                      ? <Check size={15} className="text-emerald-500" />
                      : <X size={15} className="text-red-400" />
                    }
                  </span>
                )}
              </div>
            </div>

            <button
              id="signup-submit"
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full btn-lg mt-1"
            >
              {loading ? (
                <><span className="spinner !w-4 !h-4 !border-2 !border-white/30 !border-t-white" /> Creating account...</>
              ) : (
                <>Create Free Account <ArrowRight size={16} /></>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-indigo-600 font-semibold hover:underline">
              Sign in →
            </Link>
          </p>
        </motion.div>
      </div>

      {/* ── OTP Modal ──────────────────────────────────────────────── */}
      {showOTP && (
        <div className="modal-overlay">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="modal-content"
          >
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Mail size={24} className="text-indigo-500" />
              </div>
              <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Verify your email
              </h2>
              <p className="text-sm text-slate-500 mt-2">
                We've sent a 6-digit code to <strong>{form.email}</strong>. Enter it below to verify your account.
              </p>
            </div>

            {otpError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-5 flex items-center gap-2">
                <AlertCircle size={16} className="flex-shrink-0" /> {otpError}
              </div>
            )}

            <form onSubmit={handleVerifyOTP}>
              <div className="mb-5">
                <label className="form-label text-center">Verification Code</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  className="form-input text-center text-2xl tracking-[0.5em] font-bold py-3"
                  placeholder="••••••"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                />
              </div>
              <button
                type="submit"
                disabled={otpLoading || otp.length !== 6}
                className="btn btn-primary w-full btn-lg"
              >
                {otpLoading ? (
                  <><span className="spinner !w-4 !h-4 !border-2 !border-white/30 !border-t-white" /> Verifying...</>
                ) : (
                  'Verify Email'
                )}
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* ── Right: Visual Panel ────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="hidden lg:flex flex-1 bg-gradient-to-br from-indigo-700 via-indigo-600 to-cyan-600 relative overflow-hidden flex-col items-center justify-center gap-10 px-12"
      >
        <div
          className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '28px 28px' }}
        />

        {/* Globe */}
        <div className="w-72 h-72 relative z-10">
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

        {/* Benefits */}
        <div className="relative z-10">
          <div className="text-white font-bold text-xl mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            What you get for free:
          </div>
          <div className="flex flex-col gap-3">
            {benifits.map((b) => (
              <div key={b} className="flex items-center gap-3 text-white/80 text-sm">
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Check size={11} className="text-white" />
                </div>
                {b}
              </div>
            ))}
          </div>
        </div>
      </motion.div>

    </div>
  );
};

export default Signup;
