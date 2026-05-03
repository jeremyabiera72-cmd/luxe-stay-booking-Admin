import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  BedDouble, 
  CalendarCheck, 
  Star, 
  MessageSquare, 
  AlertTriangle, 
  LogOut, 
  Menu, 
  X,
  ChevronRight,
  Sparkles,
  Bot
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: BedDouble, label: 'Rooms', path: '/rooms' },
  { icon: CalendarCheck, label: 'Bookings', path: '/bookings' },
  { icon: Star, label: 'Ratings', path: '/ratings' },
  { icon: MessageSquare, label: 'Messages', path: '/messages' },
  { icon: Sparkles, label: 'Services', path: '/services' },
  { icon: Bot, label: 'AI Monitor', path: '/automation' },
  { icon: AlertTriangle, label: 'Reports', path: '/reports' },
];

export const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-luxury-black flex text-white">
      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-50 bg-luxury-charcoal border-r border-luxury-gray transition-all duration-300 ease-in-out",
          isSidebarOpen ? "w-64" : "w-20"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-24 flex items-center px-6 border-b border-white/5 bg-white/[0.02]">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="flex-shrink-0">
                <img 
                  src="https://images.unsplash.com/photo-1541343672885-9be56236302a?q=80&w=100&h=100&auto=format&fit=crop"
                  alt="LuxeStay Logo"
                  className="w-10 h-10 rounded-full border border-gold/40 object-cover shadow-[0_0_15px_rgba(197,160,89,0.2)]"
                  referrerPolicy="no-referrer"
                />
              </div>
              <AnimatePresence mode="wait">
                {isSidebarOpen && (
                  <motion.div 
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -5 }}
                    className="flex flex-col min-w-0"
                  >
                    <span className="text-lg font-serif font-bold tracking-[0.15em] text-gold leading-tight">
                      LUXESTAY
                    </span>
                    <span className="text-[9px] uppercase tracking-[0.4em] text-white/40 font-semibold">
                      Grand Hotel
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="flex-1 py-6 px-3 space-y-2 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-4 px-3 py-3 rounded-lg transition-all group relative",
                    isActive 
                      ? "bg-gold/10 text-gold" 
                      : "text-gray-400 hover:bg-luxury-gray hover:text-white"
                  )}
                >
                  <item.icon className={cn("w-5 h-5", isActive ? "text-gold" : "group-hover:text-gold transition-colors")} />
                  {isSidebarOpen && (
                    <span className="font-medium">{item.label}</span>
                  )}
                  {isActive && (
                    <motion.div 
                      layoutId="active-pill"
                      className="absolute left-0 w-1 h-6 bg-gold rounded-r-full"
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Footer / Logout */}
          <div className="p-4 border-t border-luxury-gray">
            <Button
              variant="ghost"
              onClick={handleLogout}
              className={cn(
                "w-full flex items-center gap-4 justify-start text-gray-400 hover:text-red-400 hover:bg-red-400/10",
                !isSidebarOpen && "px-0 justify-center"
              )}
            >
              <LogOut className="w-5 h-5" />
              {isSidebarOpen && <span>Logout</span>}
            </Button>
          </div>
        </div>

        {/* Toggle Button */}
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute -right-3 top-24 w-6 h-6 bg-gold rounded-full flex items-center justify-center text-luxury-black shadow-lg hover:scale-110 transition-transform"
        >
          {isSidebarOpen ? <X className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </button>
      </aside>

      {/* Main Content */}
      <main 
        className={cn(
          "flex-1 transition-all duration-300 ease-in-out",
          isSidebarOpen ? "ml-64" : "ml-20"
        )}
      >
        <header className="h-20 border-b border-luxury-gray flex items-center justify-between px-8 sticky top-0 bg-luxury-black/80 backdrop-blur-md z-40">
          <h2 className="text-2xl font-serif font-medium">
            {navItems.find(item => item.path === location.pathname)?.label || 'Dashboard'}
          </h2>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium">{auth.currentUser?.email}</p>
              <p className="text-xs text-gold">Administrator</p>
            </div>
            <div className="w-10 h-10 rounded-full border border-gold p-0.5">
              <div className="w-full h-full rounded-full bg-luxury-gray flex items-center justify-center">
                <span className="text-gold font-bold">A</span>
              </div>
            </div>
          </div>
        </header>

        <div className="p-8">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
};
