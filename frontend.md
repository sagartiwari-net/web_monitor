# WebMonitor — Complete Frontend Redesign Plan

## Vision
Transform WebMonitor into a **premium, modern SaaS dashboard** with a clean light theme, Three.js 3D hero animations, smooth scroll interactions, and a fully responsive mobile-first layout.

Inspiration: Linear.app + Vercel Dashboard + Resend.com  
Theme: **Crisp White + Deep Indigo + Soft gradients**

---

## 🎨 Design System (Global)

### Color Palette (New)
| Token | Value | Usage |
|---|---|---|
| `--primary` | `#4f46e5` (Indigo-600) | Buttons, links, active states |
| `--primary-light` | `#eef2ff` | Backgrounds, hover states |
| `--accent` | `#06b6d4` (Cyan-500) | Highlights, badges, charts |
| `--success` | `#10b981` | UP status, positive |
| `--danger` | `#ef4444` | DOWN status, errors |
| `--warning` | `#f59e0b` | Pending, warnings |
| `--text-1` | `#0f172a` | Primary headings |
| `--text-2` | `#64748b` | Secondary text |
| `--text-3` | `#94a3b8` | Muted/placeholder |
| `--bg` | `#f8fafc` | Page background |
| `--surface` | `#ffffff` | Cards, panels |
| `--border` | `#e2e8f0` | Borders |

### Typography
- **Font:** `Plus Jakarta Sans` (headings) + `Inter` (body) from Google Fonts
- **Scale:** 12 / 14 / 16 / 20 / 24 / 32 / 48 / 64px
- **Weights:** 400 (regular) · 500 (medium) · 600 (semibold) · 700 (bold) · 800 (extrabold)

### Spacing & Layout
- **Base unit:** 4px
- **Border radius:** 8px (inputs) · 12px (cards) · 16px (modals) · 9999px (pills/badges)
- **Container max-width:** 1280px, padded 16px mobile / 24px tablet / 32px desktop
- **Shadows:** Soft multi-layer shadows, NO harsh drop shadows

### Animations Library
- **Three.js** — 3D animated globe/network on homepage hero
- **Framer Motion** — page transitions, element entrance animations
- **Lenis** — ultra-smooth scroll
- **CSS Transitions** — micro-interactions on hover/focus

---

## 📱 Breakpoints (Mobile-First)
| Name | Min-Width | Targets |
|---|---|---|
| `sm` | 375px | iPhone SE, small phones |
| `md` | 768px | iPad, tablets |
| `lg` | 1024px | iPad Pro, laptops |
| `xl` | 1280px | Desktop |
| `2xl` | 1536px | Large monitors |

---

## 📄 Pages Plan

### 1. Homepage (`/`) — Complete Redesign

#### Sections:
1. **Sticky Navbar**
   - Logo + nav links (Features, Pricing, Status)
   - CTA: "Login" (ghost) + "Get Started Free →" (primary pill)
   - Mobile: hamburger menu with slide-in drawer
   - Adds `backdrop-blur + border-bottom` on scroll

2. **Hero Section (Three.js)**
   - Headline: "Your Websites. Always Online. Always Optimized."
   - Subtext + CTA buttons
   - **Three.js Canvas:** Animated 3D globe with glowing connection lines representing server nodes — floating slowly, rotating on mouse hover
   - Animated status cards floating near the globe ("✅ toolsmandi.com — 42ms UP")
   - Background: very subtle mesh gradient (white to indigo-50)

3. **Stats Bar** — 3 animated counters (99.9% Uptime, 50+ Monitors, 5min Checks)

4. **Features Grid** — 6 feature cards with icon, headline, description, hover lift + glow

5. **How It Works** — 3-step horizontal flow with connecting arrows and step-in animations on scroll

6. **Pricing Section** — 3-column cards, "Most Popular" highlighted with indigo gradient + floating badge

7. **Testimonials** — Horizontal scroll carousel (will use placeholder text)

8. **CTA Banner** — Full-width indigo gradient with headline + button

9. **Footer** — 4-column links grid + copyright

---

### 2. Login Page (`/login`) — Full Redesign

- **Split Layout (on desktop):** Left = 60% form panel (white), Right = 40% visual panel (indigo gradient with floating animated cards showing live monitor data)
- **Mobile:** Full-screen form only
- **Form:**
  - Logo centered at top
  - "Welcome back" heading
  - Email + Password inputs with floating labels
  - "Forgot password?" link
  - Submit button with loading spinner
  - "Don't have an account? Sign up" link at bottom
- **Animations:** Form cards slide in from left, visual panel fades in from right

---

### 3. Signup Page (`/signup`) — NEW PAGE  
*(Currently not a separate page — adding one)*

- Same split layout as Login
- Form: Name + Email + Password + Confirm Password
- Progress bar for password strength
- Submit → success state

---

### 4. User Dashboard (`/dashboard`) — Redesign

#### Layout:
- **New Sidebar** (on desktop): Fixed 240px wide, with icon+label nav items
- **Mobile**: Bottom tab bar (4 icons) — Dashboard, Monitors, Billing, Settings
- **Tablet**: Collapsible sidebar with icon-only mode

#### Dashboard Content:
1. **Top Stats Row:** 4 metric cards (Total Monitors / UP / DOWN / Avg Response Time)
2. **Monitors Table:** 
   - Sleek row cards with status dot (animated pulse for DOWN), site name, URL, response time badge, last checked
   - Row hover: lift + shadow
   - Status column: colored pill badge
3. **Add Monitor Button:** Floating Action Button (FAB) on mobile, inline button on desktop
4. **Add Monitor Modal:** Multi-step form (Step 1: Type → Step 2: URL/details → Step 3: Confirm)
5. **AI Chatbot:** Floating icon button → slide-up panel (already exists, just redesigned)

---

### 5. Monitor Detail Page (`/monitor/:id`) — Redesign

1. **Header:** Breadcrumb + site name + status badge + action buttons (Edit, Pause, Delete)
2. **Stats Row:** 4 cards (Status / Response Time / Uptime % / Last Checked)
3. **DOWN Reason Banner:** More visual — red gradient with icon and error code chip
4. **Uptime Timeline:** UptimeRobot style — thin colored bars, 90-day range selector tabs
5. **Incident Log:** Collapsible table of down events
6. **PageSpeed Audit Section:** Score dials (circular progress rings) + AI analysis card

---

### 6. Admin Dashboard (`/admin`) — Visual Polish

- Keep existing tabs/functionality
- Redesign: Improved table styling, better modals, sidebar consistent with user dashboard
- Add subtle data visualization (small sparkline charts for payment trends)

---

## 📦 New Dependencies to Install
```
npm install three @react-three/fiber @react-three/drei framer-motion @studio-freight/lenis
```

| Package | Purpose |
|---|---|
| `three` | 3D globe/network for homepage hero |
| `@react-three/fiber` | React renderer for Three.js |
| `@react-three/drei` | Helpers (OrbitControls, Stars, etc.) |
| `framer-motion` | Page transitions + element animations |
| `@studio-freight/lenis` | Ultra-smooth scrolling |

---

## 🗂️ New File Structure
```
client/src/
├── components/
│   ├── ui/              (Button, Badge, Card, Input, Modal — reusable)
│   ├── three/           (GlobeScene.jsx, NetworkParticles.jsx)
│   ├── Navbar.jsx       (new sticky navbar)
│   ├── Footer.jsx       (new footer)
│   └── Chatbot.jsx      (existing, keep)
├── layouts/
│   ├── AppLayout.jsx    (redesigned sidebar)
│   └── AuthLayout.jsx   (new split layout)
├── pages/
│   ├── Home.jsx         (full rewrite)
│   ├── Login.jsx        (full rewrite)
│   ├── Signup.jsx       (NEW)
│   ├── Dashboard.jsx    (full rewrite)
│   ├── MonitorDetail.jsx(full rewrite)
│   ├── Admin.jsx        (polish)
│   └── Billing.jsx      (polish)
└── index.css            (new design tokens + utilities)
```

---

## 🚀 Execution Order (Phase-by-Phase)

### Phase 1 — Foundation (index.css + design tokens)
### Phase 2 — Homepage + Navbar + Footer  
### Phase 3 — Auth Pages (Login + Signup)
### Phase 4 — Dashboard + Sidebar Layout
### Phase 5 — Monitor Detail Page
### Phase 6 — Admin Dashboard Polish
### Phase 7 — Mobile Testing & Responsive Fixes

---

## Open Questions

> [!IMPORTANT]
> Kya aapke paas **Signup** page ka backend API already hai? (`POST /api/auth/register`) — so we can build the Signup form.

> [!NOTE]
> Three.js globe on a shared hosting server should work fine since it runs 100% on the client side. Par agar server bahut slow ho, toh ham ek lightweight CSS animation fallback rakhenge.
