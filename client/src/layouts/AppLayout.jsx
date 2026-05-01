import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, CreditCard, Settings, Users, LogOut,
  Ticket, Bell, Mail, Activity, ChevronLeft, Menu, X,
  BarChart3, Home, User
} from 'lucide-react';

const AppLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const adminNavItems = [
    { name: 'Pending Payments', path: '/admin',              icon: Ticket,          end: true },
    { name: 'All Payments',     path: '/admin?tab=payments', icon: CreditCard,      end: false },
    { name: 'Users',            path: '/admin?tab=users',    icon: Users,           end: false },
    { name: 'Coupons',          path: '/admin?tab=coupons',  icon: Ticket,          end: false },
    { name: 'Email Templates',  path: '/admin?tab=email-templates', icon: Mail,     end: false },
    { name: 'Settings',         path: '/admin?tab=settings', icon: Settings,        end: false },
  ];

  const userNavItems = [
    { name: 'Dashboard',    path: '/dashboard', icon: LayoutDashboard, end: true },
    { name: 'Billing',      path: '/billing',   icon: CreditCard,       end: true },
    { name: 'Profile',      path: '/profile',   icon: User,             end: true },
  ];

  const isAdmin = user?.role === 'admin';
  const navItems = isAdmin ? adminNavItems : userNavItems;

  // Bottom extra link for admins to switch to user view
  const switchLink = isAdmin
    ? { name: 'User Dashboard', path: '/dashboard', icon: LayoutDashboard }
    : null;

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-100">
        <Link to={isAdmin ? '/admin' : '/dashboard'} className="flex items-center gap-2 no-underline">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
            <Activity size={15} className="text-white" />
          </div>
          <span className="font-extrabold text-slate-900 text-base" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Narada <span className="text-indigo-600">Ai</span>
          </span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto">
        {isAdmin && (
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest px-3 mb-2">Admin</div>
        )}
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            end={item.end}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `sidebar-nav-item ${isActive ? 'active' : ''} no-underline`
            }
          >
            <item.icon size={17} />
            {item.name}
          </NavLink>
        ))}

        {switchLink && (
          <>
            <div className="h-px bg-slate-100 my-3" />
            <NavLink
              to={switchLink.path}
              className="sidebar-nav-item no-underline"
              onClick={() => setSidebarOpen(false)}
            >
              <switchLink.icon size={17} />
              {switchLink.name}
            </NavLink>
          </>
        )}
      </nav>

      {/* User Info + Logout */}
      <div className="px-3 py-4 border-t border-slate-100">
        <div className="flex items-center gap-3 px-3 py-2 mb-2 rounded-lg bg-slate-50">
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <span className="text-indigo-700 font-bold text-sm">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </span>
          </div>
          <div className="overflow-hidden">
            <div className="text-sm font-semibold text-slate-800 truncate">{user?.name}</div>
            <div className="text-xs text-slate-400 truncate">{user?.email}</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
        >
          <LogOut size={15} />
          Logout
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-slate-50">

      {/* ── Desktop Sidebar ─────────────────────────────────────────── */}
      <aside className="sidebar hidden lg:flex flex-col">
        <SidebarContent />
      </aside>

      {/* ── Mobile Sidebar Drawer ───────────────────────────────────── */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/40 z-40 lg:hidden"
            />
            {/* Drawer */}
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 h-screen w-64 bg-white border-r border-slate-100 flex flex-col z-50 lg:hidden"
            >
              <button
                onClick={() => setSidebarOpen(false)}
                className="absolute top-4 right-4 btn btn-ghost btn-icon"
              >
                <X size={18} />
              </button>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Main Content ────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col lg:ml-[240px]">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-100 sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="btn btn-ghost btn-icon"
            aria-label="Open sidebar"
          >
            <Menu size={20} />
          </button>
          <span className="font-extrabold text-slate-900 text-base" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Narada <span className="text-indigo-600">Ai</span>
          </span>
        </div>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 mb-16 lg:mb-0">
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-6 py-2 flex justify-between items-center z-40 pb-[env(safe-area-inset-bottom)]">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 p-2 min-w-[64px] transition-colors no-underline ${
                  isActive ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
                }`
              }
            >
              <item.icon size={20} className={item.name === 'Dashboard' ? 'mb-0.5' : ''} />
              <span className="text-[10px] font-semibold">{item.name}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AppLayout;
