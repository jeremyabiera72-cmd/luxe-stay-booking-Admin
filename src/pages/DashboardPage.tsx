import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, limit, getDocsFromServer, deleteDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Users, 
  BedDouble, 
  CalendarCheck, 
  TrendingUp, 
  Clock,
  ChevronRight,
  AlertTriangle,
  Plus
} from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';
import { toast } from 'sonner';

export const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState({
    totalRooms: 0,
    activeBookings: 0,
    totalRevenue: 0,
    pendingReports: 0
  });
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Real-time listeners for stats
    const unsubRooms = onSnapshot(collection(db, 'rooms'), (snap) => {
      setStats(prev => ({ ...prev, totalRooms: snap.size }));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'rooms');
    });

    const unsubBookings = onSnapshot(collection(db, 'bookings'), (snap) => {
      const bookings = snap.docs.map(doc => doc.data());
      const active = bookings.filter(b => b.status === 'confirmed').length;
      const revenue = bookings.reduce((acc, b) => acc + (b.totalAmount || 0), 0);
      setStats(prev => ({ ...prev, activeBookings: active, totalRevenue: revenue }));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'bookings');
    });

    const unsubReports = onSnapshot(collection(db, 'reports'), (snap) => {
      const pending = snap.docs.filter(doc => doc.data().status === 'open').length;
      setStats(prev => ({ ...prev, pendingReports: pending }));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'reports');
    });

    // Recent bookings
    const q = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'), limit(5));
    const unsubRecent = onSnapshot(q, (snap) => {
      setRecentBookings(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'recent-bookings');
    });

    return () => {
      unsubRooms();
      unsubBookings();
      unsubReports();
      unsubRecent();
    };
  }, []);

  const clearAllData = async () => {
    console.log('Global Reset triggered');
    if (!auth.currentUser) {
      toast.error('Authentication required.');
      return;
    }

    const toastId = toast.loading('Resetting entire system data...');
    try {
      const collections = ['rooms', 'bookings', 'reports', 'reviews', 'contacts', 'services'] as const;
      let totalDeleted = 0;

      for (const colName of collections) {
        console.log(`Clearing collection: ${colName}`);
        try {
          const snap = await getDocsFromServer(collection(db, colName)).catch(e => {
            handleFirestoreError(e, OperationType.LIST, colName);
            return undefined;
          });
          if (snap) {
            const deletes = snap.docs.map(d => deleteDoc(d.ref).catch(e => {
              handleFirestoreError(e, OperationType.DELETE, d.ref.path);
            }));
            await Promise.all(deletes);
            totalDeleted += snap.size;
          }
        } catch (colError: any) {
          console.warn(`Failed to clear collection ${colName}:`, colError);
          if (colError.message.includes('authInfo')) throw colError;
        }
      }
      
      toast.success(`System Reset Complete. Removed ${totalDeleted} records.`, { id: toastId });
      
      // Force reload to clear any local state or hooks
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error: any) {
      console.error('Reset error:', error);
      toast.error(`Reset failed: ${error.message || 'Unknown error'}`, { id: toastId });
    }
  };

  const statCards = [
    { label: 'Total Suites', value: stats.totalRooms, icon: BedDouble, color: 'text-gold' },
    { label: 'Guest Reservations', value: stats.activeBookings, icon: CalendarCheck, color: 'text-gold' },
    { label: 'Revenue Generated', value: `$${stats.totalRevenue.toLocaleString()}`, icon: TrendingUp, color: 'text-gold' },
    { label: 'System Alerts', value: stats.pendingReports, icon: Clock, color: 'text-gold' },
  ];

  return (
    <div className="space-y-10">
      {/* Welcome Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-4xl font-serif text-white tracking-tight">Executive Overview</h1>
        <p className="text-gray-500 text-sm tracking-[0.2em] uppercase font-medium">Welcome back to LuxeStay Grand Hotel Dashboard</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {statCards.map((stat, i) => (
          <Card key={i} className="luxury-card group hover:border-gold/30 transition-all duration-500">
            <CardContent className="p-8">
              <div className="flex flex-col gap-4">
                <div className={cn("p-3 w-fit rounded-full bg-white/5 border border-white/10 group-hover:border-gold/50 transition-colors", stat.color)}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-gray-500 text-[10px] uppercase tracking-[0.2em] font-bold mb-1">{stat.label}</p>
                  <h3 className="text-3xl font-medium tracking-tight whitespace-nowrap">{stat.value}</h3>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Recent Bookings */}
        <Card className="luxury-card lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between border-b border-white/5 p-8">
            <div className="flex flex-col gap-1">
              <CardTitle className="text-2xl font-serif">Latest Registrations</CardTitle>
              <CardDescription className="text-gray-500 text-xs">Recently finalized and pending stay requests</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="text-gold hover:text-gold-light tracking-widest text-[10px] uppercase font-bold">
              View Registers <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-gray-500 text-[10px] uppercase tracking-[0.3em] font-bold border-b border-white/5 bg-white/[0.02]">
                    <th className="px-8 py-4">Guest Identity</th>
                    <th className="px-8 py-4">Suite</th>
                    <th className="px-8 py-4">Timeline</th>
                    <th className="px-8 py-4">Status</th>
                    <th className="px-8 py-4">Valuation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {recentBookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-white/[0.01] transition-colors group">
                      <td className="px-8 py-6">
                        <div className="font-medium text-sm group-hover:text-gold transition-colors">{booking.customerName}</div>
                        <div className="text-[10px] text-gray-500 font-mono">{booking.customerEmail}</div>
                      </td>
                      <td className="px-8 py-6 text-xs text-gray-400 font-serif italic">{booking.roomName}</td>
                      <td className="px-8 py-6 text-xs text-gray-500">
                        {booking.createdAt?.toDate ? format(booking.createdAt.toDate(), 'MMM d, yyyy') : 'N/A'}
                      </td>
                      <td className="px-8 py-6">
                        <Badge 
                          variant="outline"
                          className={cn(
                            "capitalize font-bold text-[9px] tracking-widest px-2 py-0.5 rounded-none border-[1px]",
                            booking.status === 'confirmed' ? "text-green-500 border-green-500/30 bg-green-500/5" :
                            booking.status === 'pending' ? "text-yellow-500 border-yellow-500/30 bg-yellow-500/5" :
                            "text-red-500 border-red-500/30 bg-red-500/5"
                          )}
                        >
                          {booking.status}
                        </Badge>
                      </td>
                      <td className="px-8 py-6 text-sm font-medium text-white/80">
                        ${booking.totalAmount?.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {recentBookings.length === 0 && !loading && (
                    <tr>
                      <td colSpan={5} className="px-8 py-20 text-center text-gray-600 font-serif italic">
                        The register is currently empty.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions / Notifications */}
        <div className="space-y-10">
          <Card className="luxury-card">
            <CardHeader className="p-8 border-b border-white/5">
              <div className="flex items-center justify-between mb-1">
                <CardTitle className="text-xl font-serif">Operations</CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearAllData}
                  className="text-red-400 hover:text-red-300 hover:bg-red-400/10 text-[9px] h-6 px-2 uppercase tracking-tighter"
                >
                  System Purge
                </Button>
              </div>
              <CardDescription className="text-xs text-gray-500">Core administrative tasks</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-4">
              <Button className="w-full justify-start gold-gradient text-luxury-black font-bold h-12 rounded-xl group overflow-hidden relative">
                <span className="relative z-10 flex items-center">
                  <Plus className="w-4 h-4 mr-3" /> Register New Suite
                </span>
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              </Button>
              <Button variant="outline" className="w-full justify-start border-white/10 hover:border-gold/50 h-12 rounded-xl text-xs font-bold tracking-widest text-gray-400 hover:text-white transition-all">
                <CalendarCheck className="w-4 h-4 mr-3 text-gold" /> AUDIT RESERVATIONS
              </Button>
              <Button variant="outline" className="w-full justify-start border-white/10 hover:border-gold/50 h-12 rounded-xl text-xs font-bold tracking-widest text-gray-400 hover:text-white transition-all">
                <AlertTriangle className="w-4 h-4 mr-3 text-red-500" /> REVIEW INCIDENTS
              </Button>
            </CardContent>
          </Card>

          <Card className="luxury-card border-gold/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gold/10 blur-[60px] rounded-full" />
            <CardHeader className="p-8">
              <CardTitle className="text-lg font-serif text-gold tracking-widest uppercase">Occupancy</CardTitle>
            </CardHeader>
            <CardContent className="p-8 pt-0">
              <div className="flex items-baseline gap-2 mb-6">
                <span className="text-6xl font-serif text-white tracking-tighter">
                  {stats.totalRooms > 0 ? Math.round((stats.activeBookings / stats.totalRooms) * 100) : 0}
                </span>
                <span className="text-2xl text-gold font-serif">%</span>
              </div>
              <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${stats.totalRooms > 0 ? (stats.activeBookings / stats.totalRooms) * 100 : 0}%` }}
                  className="h-full gold-gradient"
                />
              </div>
              <p className="text-[10px] text-gray-500 mt-4 uppercase tracking-[0.2em] font-medium">Real-time hotel utilization</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
