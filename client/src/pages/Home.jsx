import { useState, useEffect, useRef, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView, useAnimation } from 'framer-motion';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Sphere, MeshDistortMaterial, Float } from '@react-three/drei';
import {
  Activity, Shield, Zap, Globe, Bot, Lock, BarChart3,
  CheckCircle, ArrowRight, Bell, Server, Clock, Mail,
  ChevronRight, ExternalLink, Menu, X
} from 'lucide-react';

/* ── Animated 3D Sphere ─────────────────────────────────────────────── */
const AnimatedSphere = () => (
  <Float speed={1.4} rotationIntensity={0.4} floatIntensity={0.6}>
    <Sphere args={[1.8, 100, 200]} scale={1}>
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

/* ── Animated Counter ────────────────────────────────────────────────── */
const Counter = ({ target, suffix = '', duration = 2000 }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    const start = Date.now();
    const step = () => {
      const progress = Math.min((Date.now() - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(ease * target));
      if (progress < 1) requestAnimationFrame(step);
      else setCount(target);
    };
    requestAnimationFrame(step);
  }, [inView, target, duration]);

  return <span ref={ref}>{count}{suffix}</span>;
};

/* ── Fade-In on Scroll ───────────────────────────────────────────────── */
const FadeIn = ({ children, delay = 0, direction = 'up', className = '' }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const variants = {
    hidden: { opacity: 0, y: direction === 'up' ? 24 : direction === 'down' ? -24 : 0, x: direction === 'left' ? 24 : direction === 'right' ? -24 : 0 },
    visible: { opacity: 1, y: 0, x: 0 },
  };
  return (
    <motion.div
      ref={ref}
      variants={variants}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      transition={{ duration: 0.55, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/* ── Feature Card Data ───────────────────────────────────────────────── */
const features = [
  { icon: Activity,    color: 'indigo',  title: 'Real-time Uptime',     desc: 'Ping every 5 minutes from our servers. Instant DOWN alerts before your customers notice.' },
  { icon: Bot,         color: 'purple',  title: 'AI Root-Cause',        desc: 'When a site fails, Gemini AI instantly diagnoses why — DNS, SSL, server error, or timeout.' },
  { icon: Zap,         color: 'cyan',    title: 'PageSpeed Audits',     desc: 'Google Lighthouse integration gives you Performance, SEO, Accessibility scores on demand.' },
  { icon: Lock,        color: 'emerald', title: 'SSL Monitoring',       desc: 'Track certificate expiry dates. Get alerted 30 days before SSL expires to avoid downtime.' },
  { icon: Bell,        color: 'orange',  title: 'Smart Alerts',         desc: 'Receive rich HTML email alerts the moment your site goes down or comes back up.' },
  { icon: BarChart3,   color: 'rose',    title: 'Uptime Timeline',      desc: 'Visual 90-day history bars show exactly when your site was up or down at a glance.' },
];

const colorMap = {
  indigo:  { bg: 'bg-indigo-50',  text: 'text-indigo-600', border: 'border-indigo-100' },
  purple:  { bg: 'bg-purple-50',  text: 'text-purple-600', border: 'border-purple-100' },
  cyan:    { bg: 'bg-cyan-50',    text: 'text-cyan-600',   border: 'border-cyan-100'   },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600',border: 'border-emerald-100'},
  orange:  { bg: 'bg-orange-50',  text: 'text-orange-600', border: 'border-orange-100' },
  rose:    { bg: 'bg-rose-50',    text: 'text-rose-600',   border: 'border-rose-100'   },
};

/* ── Steps ───────────────────────────────────────────────────────────── */
const steps = [
  { n: '01', icon: Globe,  title: 'Add Your Website',   desc: 'Enter your URL and choose HTTP, Port, or Keyword monitoring in seconds.' },
  { n: '02', icon: Server, title: 'We Monitor 24/7',    desc: 'Our servers ping your site every 5 minutes from multiple check points.' },
  { n: '03', icon: Bell,   title: 'Get Instant Alerts', desc: 'When something breaks, you get an email with the exact reason — powered by AI.' },
];

/* ── Pricing ─────────────────────────────────────────────────────────── */
const plans = [
  {
    name: 'Basic', price: '₹299', period: '/mo',
    desc: 'Perfect for personal projects',
    features: ['3 Monitors', '5-min check interval', 'Email Alerts', '30-day log history'],
    cta: 'Get Started', highlight: false,
  },
  {
    name: 'Pro', price: '₹599', period: '/mo',
    desc: 'For professionals & small teams',
    features: ['20 Monitors', '5-min check interval', 'Email Alerts', 'AI Root-Cause Analysis', 'PageSpeed Audits', '90-day history'],
    cta: 'Start Pro', highlight: true,
  },
  {
    name: 'Elite', price: '₹1499', period: '/mo',
    desc: 'For agencies & large businesses',
    features: ['100 Monitors', '5-min check interval', 'Priority Support', 'All Pro features', 'SSL Monitoring', 'Custom Reports'],
    cta: 'Go Elite', highlight: false,
  },
];

/* ── Home Component ──────────────────────────────────────────────────── */
const Home = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-900 overflow-x-hidden">

      {/* ── Navbar ─────────────────────────────────────────────────── */}
      <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
        <div className="container flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 no-underline">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Activity size={16} className="text-white" />
            </div>
            <span className="font-extrabold text-slate-900 text-lg" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Narada <span className="text-indigo-600">Ai</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm font-medium text-slate-600 hover:text-slate-900 no-underline transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm font-medium text-slate-600 hover:text-slate-900 no-underline transition-colors">How It Works</a>
            <a href="#pricing" className="text-sm font-medium text-slate-600 hover:text-slate-900 no-underline transition-colors">Pricing</a>
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link to="/login" className="btn btn-ghost btn-sm">Login</Link>
            <Link to="/signup" className="btn btn-primary btn-sm btn-pill">
              Start Free <ArrowRight size={14} />
            </Link>
          </div>

          {/* Mobile Hamburger */}
          <button
            className="md:hidden btn btn-ghost btn-icon"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden border-t border-slate-100 bg-white px-4 py-4 flex flex-col gap-1"
          >
            <a href="#features" onClick={() => setMobileOpen(false)} className="sidebar-nav-item no-underline">Features</a>
            <a href="#how-it-works" onClick={() => setMobileOpen(false)} className="sidebar-nav-item no-underline">How It Works</a>
            <a href="#pricing" onClick={() => setMobileOpen(false)} className="sidebar-nav-item no-underline">Pricing</a>
            <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
              <Link to="/login" className="btn btn-secondary flex-1">Login</Link>
              <Link to="/signup" className="btn btn-primary flex-1">Sign Up Free</Link>
            </div>
          </motion.div>
        )}
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section className="relative min-h-[88vh] flex items-center overflow-hidden">
        {/* Background grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'radial-gradient(circle, #4f46e5 1px, transparent 1px)', backgroundSize: '32px 32px' }}
        />
        {/* Gradient orbs */}
        <div className="absolute top-1/4 right-0 w-96 h-96 bg-indigo-100 rounded-full blur-3xl opacity-50 pointer-events-none" />
        <div className="absolute bottom-1/4 left-0 w-72 h-72 bg-cyan-100 rounded-full blur-3xl opacity-40 pointer-events-none" />

        <div className="container relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center py-16">

            {/* Left — Text */}
            <div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <span className="section-tag">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse inline-block" />
                  Smart Website Monitoring Platform
                </span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, delay: 0.1 }}
                className="mt-4 mb-6 leading-tight"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800 }}
              >
                Your websites.{' '}
                <span className="gradient-text">Always online.</span>{' '}
                Always optimized.
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-lg text-slate-500 mb-8 leading-relaxed max-w-lg"
              >
                Narada Ai monitors your websites 24/7, alerts you the moment something breaks,
                and uses <strong className="text-slate-700">Gemini AI</strong> to tell you exactly why.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="flex flex-col sm:flex-row gap-3"
              >
                <Link to="/signup" className="btn btn-primary btn-lg btn-pill">
                  Start Monitoring Free <ArrowRight size={18} />
                </Link>
                <a href="#how-it-works" className="btn btn-secondary btn-lg btn-pill">
                  See How It Works
                </a>
              </motion.div>

              {/* Trust badges */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="flex items-center gap-4 mt-8 flex-wrap"
              >
                {['No credit card required', '5-min setup', 'Free forever plan'].map((t) => (
                  <span key={t} className="flex items-center gap-1.5 text-sm text-slate-500">
                    <CheckCircle size={14} className="text-emerald-500 flex-shrink-0" />
                    {t}
                  </span>
                ))}
              </motion.div>
            </div>

            {/* Right — 3D Globe */}
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.9, delay: 0.2 }}
              className="hidden lg:flex items-center justify-center relative"
            >
              <div className="w-[480px] h-[480px]">
                <Suspense fallback={null}>
                  <Canvas camera={{ position: [0, 0, 4.5], fov: 45 }}>
                    <ambientLight intensity={0.8} />
                    <directionalLight position={[5, 10, 5]} intensity={1.5} color="#ffffff" />
                    <directionalLight position={[-5, -10, -5]} intensity={1} color="#6366f1" />
                    <pointLight position={[10, 10, 10]} intensity={1.5} color="#a5b4fc" />
                    <pointLight position={[-10, -10, -10]} intensity={0.5} color="#67e8f9" />
                    <AnimatedSphere />
                    <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.8} />
                  </Canvas>
                </Suspense>
              </div>

              {/* Floating status cards */}
              <div className="absolute top-16 left-0 card card-glass shadow-md animate-float px-3 py-2 flex items-center gap-2 text-xs font-medium whitespace-nowrap">
                <span className="status-dot status-dot-up" />
                toolsmandi.com — <span className="text-emerald-600 font-bold">42ms</span>
              </div>
              <div className="absolute bottom-24 right-0 card card-glass shadow-md animate-float-2 px-3 py-2 flex items-center gap-2 text-xs font-medium whitespace-nowrap">
                <span className="status-dot status-dot-down" />
                <span className="text-red-500 font-bold">DOWN</span> — API timeout
              </div>
              <div className="absolute top-1/2 right-4 card card-glass shadow-md animate-float-3 px-3 py-2 text-xs font-medium whitespace-nowrap">
                <span className="text-indigo-600 font-bold">🛡️ SSL</span> — 43 days left
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Stats Bar ──────────────────────────────────────────────── */}
      <section className="border-y border-slate-100 bg-slate-50 py-10">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { label: 'Uptime Guaranteed', value: 99, suffix: '.9%' },
              { label: 'Monitors Running',  value: 50, suffix: '+' },
              { label: 'Check Interval',    value: 5,  suffix: ' min' },
              { label: 'Avg Alert Time',    value: 30, suffix: 's' },
            ].map(({ label, value, suffix }) => (
              <FadeIn key={label}>
                <div className="text-3xl font-extrabold text-indigo-600" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  <Counter target={value} suffix={suffix} />
                </div>
                <div className="text-sm text-slate-500 mt-1">{label}</div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────── */}
      <section id="features" className="py-24">
        <div className="container">
          <div className="text-center mb-16">
            <FadeIn><span className="section-tag">✦ Features</span></FadeIn>
            <FadeIn delay={0.1}><h2 className="section-heading mt-2">Everything you need to stay online</h2></FadeIn>
            <FadeIn delay={0.2}><p className="section-sub mt-3 mx-auto">Powerful monitoring tools built for developers, agencies, and growing businesses.</p></FadeIn>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, color, title, desc }, i) => {
              const c = colorMap[color];
              return (
                <FadeIn key={title} delay={i * 0.08}>
                  <div className="card card-hover cursor-default">
                    <div className={`stat-card-icon ${c.bg} mb-4`}>
                      <Icon size={20} className={c.text} />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mb-2">{title}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── How It Works ───────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 bg-slate-50">
        <div className="container">
          <div className="text-center mb-16">
            <FadeIn><span className="section-tag">⚡ Simple Setup</span></FadeIn>
            <FadeIn delay={0.1}><h2 className="section-heading mt-2">Up and running in 60 seconds</h2></FadeIn>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-10 left-1/6 right-1/6 h-px bg-gradient-to-r from-indigo-200 via-indigo-400 to-indigo-200 opacity-50" style={{ left: '20%', right: '20%', top: '2.5rem' }} />

            {steps.map(({ n, icon: Icon, title, desc }, i) => (
              <FadeIn key={n} delay={i * 0.15}>
                <div className="flex flex-col items-center text-center">
                  <div className="relative mb-6">
                    <div className="w-20 h-20 rounded-2xl bg-indigo-50 border-2 border-indigo-100 flex items-center justify-center shadow-sm">
                      <Icon size={28} className="text-indigo-600" />
                    </div>
                    <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 mb-2">{title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ────────────────────────────────────────────────── */}
      <section id="pricing" className="py-24">
        <div className="container">
          <div className="text-center mb-16">
            <FadeIn><span className="section-tag">💳 Pricing</span></FadeIn>
            <FadeIn delay={0.1}><h2 className="section-heading mt-2">Simple, transparent pricing</h2></FadeIn>
            <FadeIn delay={0.2}><p className="section-sub mt-3 mx-auto">No hidden fees. Cancel anytime. Pay via UPI.</p></FadeIn>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto items-center">
            {plans.map(({ name, price, period, desc, features: planFeatures, cta, highlight }, i) => (
              <FadeIn key={name} delay={i * 0.1}>
                <div className={`card relative ${highlight ? 'ring-2 ring-indigo-500 shadow-lg shadow-indigo-100 scale-[1.03]' : ''} flex flex-col h-full`}>
                  {highlight && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap">
                      Most Popular
                    </div>
                  )}
                  <div className="mb-5">
                    <div className="font-bold text-slate-900 text-lg mb-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{name}</div>
                    <div className="text-sm text-slate-500 mb-4">{desc}</div>
                    <div className="flex items-end gap-1">
                      <span className="text-4xl font-extrabold text-slate-900" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{price}</span>
                      <span className="text-slate-400 text-sm mb-1">{period}</span>
                    </div>
                  </div>
                  <ul className="space-y-2.5 mb-7 flex-1">
                    {planFeatures.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                        <CheckCircle size={14} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/signup"
                    className={`btn w-full ${highlight ? 'btn-primary' : 'btn-secondary'}`}
                  >
                    {cta} <ChevronRight size={15} />
                  </Link>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ─────────────────────────────────────────────── */}
      <section className="py-20">
        <div className="container">
          <FadeIn>
            <div className="rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-800 p-12 text-center text-white relative overflow-hidden">
              {/* Background orbs */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-cyan-400/10 rounded-full blur-3xl" />

              <span className="inline-block bg-white/10 text-white/80 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide mb-5">
                Get Started Today
              </span>
              <h2 className="text-3xl md:text-4xl font-extrabold mb-4 relative z-10" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Stop guessing. Start monitoring.
              </h2>
              <p className="text-indigo-200 max-w-md mx-auto mb-8 relative z-10">
                Join hundreds of websites already monitored by Narada Ai. Free plan available, no credit card needed.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center relative z-10">
                <Link to="/signup" className="btn btn-lg bg-white text-indigo-700 hover:bg-indigo-50 btn-pill font-bold border-none">
                  Create Free Account <ArrowRight size={18} />
                </Link>
                <Link to="/login" className="btn btn-lg bg-white/10 text-white hover:bg-white/20 btn-pill border-white/20">
                  Login
                </Link>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-100 bg-white py-12">
        <div className="container">
          <div className="flex flex-col md:flex-row justify-between items-start gap-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
                  <Activity size={13} className="text-white" />
                </div>
                <span className="font-extrabold text-slate-900" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Narada Ai
                </span>
              </div>
              <p className="text-sm text-slate-400 max-w-xs">Smart website monitoring powered by AI. Always watching, always alerting.</p>
            </div>
            <div className="grid grid-cols-2 gap-8 text-sm">
              <div>
                <div className="font-semibold text-slate-700 mb-3">Product</div>
                <div className="flex flex-col gap-2">
                  <a href="#features" className="text-slate-400 hover:text-slate-700 no-underline transition-colors">Features</a>
                  <a href="#pricing" className="text-slate-400 hover:text-slate-700 no-underline transition-colors">Pricing</a>
                  <Link to="/login" className="text-slate-400 hover:text-slate-700 no-underline transition-colors">Login</Link>
                </div>
              </div>
              <div>
                <div className="font-semibold text-slate-700 mb-3">Account</div>
                <div className="flex flex-col gap-2">
                  <Link to="/signup" className="text-slate-400 hover:text-slate-700 no-underline transition-colors">Sign Up</Link>
                  <Link to="/dashboard" className="text-slate-400 hover:text-slate-700 no-underline transition-colors">Dashboard</Link>
                </div>
              </div>
            </div>
          </div>
          <div className="border-t border-slate-100 mt-8 pt-6 text-center text-xs text-slate-400">
            © {new Date().getFullYear()} Narada Ai. All rights reserved.
          </div>
        </div>
      </footer>

    </div>
  );
};

export default Home;
