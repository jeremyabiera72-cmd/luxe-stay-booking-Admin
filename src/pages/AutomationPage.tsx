import React, { useEffect, useState } from 'react';
import { 
  Bot, 
  Clock, 
  CheckCircle2, 
  Mail, 
  Eye, 
  Terminal,
  Play,
  Pause,
  ArrowRight,
  Activity,
  Zap,
  Plus,
  Trash2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { db, auth, handleFirestoreError, OperationType } from '@/lib/firebase';
import { 
  addDoc, 
  collection, 
  serverTimestamp, 
  getDocs, 
  limit, 
  limit as firestoreLimit, 
  query, 
  orderBy, 
  onSnapshot,
  writeBatch,
  doc
} from 'firebase/firestore';
import { toast } from 'sonner';

interface AutomationLog {
  id: string;
  bookingId: string;
  customerName?: string;
  status: 'reading' | 'confirming' | 'mailing' | 'completed' | 'system' | 'review-ready';
  message: string;
  timestamp: any;
}

export const AutomationPage: React.FC = () => {
  const [logs, setLogs] = useState<AutomationLog[]>([]);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'automationLogs'), 
      orderBy('timestamp', 'desc'),
      limit(50)
    );
    
    const unsub = onSnapshot(q, (snap) => {
      setLogs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AutomationLog)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'automationLogs');
    });

    return () => unsub();
  }, []);

  const getStatusIcon = (status: AutomationLog['status']) => {
    switch (status) {
      case 'reading': return <Eye className="w-4 h-4 text-blue-400" />;
      case 'confirming': return <CheckCircle2 className="w-4 h-4 text-yellow-400" />;
      case 'mailing': return <Mail className="w-4 h-4 text-purple-400" />;
      case 'completed': return <Bot className="w-4 h-4 text-green-400" />;
      case 'review-ready': return <Bot className="w-4 h-4 text-green-400" />;
      case 'system': return <Activity className="w-4 h-4 text-gold/60" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      reading: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      confirming: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
      mailing: "bg-purple-500/10 text-purple-400 border-purple-500/20",
      completed: "bg-green-500/10 text-green-400 border-green-500/20",
      'review-ready': "bg-green-500/10 text-green-400 border-green-500/20",
      system: "bg-gold/5 text-gold/60 border-gold/10"
    };
    return (
      <Badge variant="outline" className={cn("capitalize font-normal", variants[status] || variants.system)}>
        {status}
      </Badge>
    );
  };

  const createTestBooking = async () => {
    const toastId = toast.loading('Sending test booking to AI...');
    try {
      // Find an available room first
      const roomsSnap = await getDocs(query(collection(db, 'rooms'), firestoreLimit(1)));
      const room = roomsSnap.docs[0]?.data();
      const roomId = roomsSnap.docs[0]?.id || 'room-123';
      const roomName = room?.name || 'Deluxe Room';

      const booking = {
        customerName: "Jeremy Abiera (Test)",
        customerEmail: auth.currentUser?.email || "jeremyabiera72@gmail.com",
        resourceId: roomId,
        roomName: roomName,
        status: "pending",
        checkIn: serverTimestamp(),
        checkOut: serverTimestamp(),
        totalAmount: 6650,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'bookings'), booking);
      toast.success('Test booking created! AI logic will now process it but leave it PENDING.', { id: toastId });
    } catch (error: any) {
      handleFirestoreError(error, OperationType.CREATE, 'bookings');
      toast.error('Failed to create test booking: ' + error.message, { id: toastId });
    }
  };

  const clearLogs = async () => {
    const toastId = toast.loading('Clearing automation logs...');
    try {
      const snap = await getDocs(collection(db, 'automationLogs'));
      const batch = writeBatch(db);
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      toast.success('Logs cleared successfully', { id: toastId });
    } catch (error: any) {
      handleFirestoreError(error, OperationType.WRITE, 'automationLogs');
      toast.error('Failed to clear logs: ' + error.message, { id: toastId });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gold/10 flex items-center justify-center">
            <Bot className="w-7 h-7 text-gold" />
          </div>
          <div>
            <h1 className="text-2xl font-serif font-bold">AI Automation Monitor</h1>
            <p className="text-sm text-gray-400">Real-time status of the automated booking assistant</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-luxury-charcoal p-2 rounded-xl border border-luxury-gray">
          <div className="flex items-center gap-2 px-3 border-r border-luxury-gray">
            <div className={cn("w-2 h-2 rounded-full", isActive ? "bg-green-500 animate-pulse" : "bg-gray-500")} />
            <span className="text-xs font-mono uppercase tracking-widest">{isActive ? "System Online" : "System Offline"}</span>
          </div>
          <button 
            onClick={() => setIsActive(!isActive)}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
          >
            {isActive ? <Pause className="w-4 h-4 text-gold" /> : <Play className="w-4 h-4 text-gold" />}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Workflow Summary */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="luxury-card border-none overflow-hidden">
            <CardHeader className="border-b border-luxury-gray/50 pb-4">
              <CardTitle className="flex items-center gap-2 text-lg font-serif">
                <Terminal className="w-5 h-5 text-gold" />
                Live Execution Logs
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[600px] overflow-y-auto font-mono text-sm">
                <AnimatePresence initial={false}>
                  {logs.map((log, idx) => (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={cn(
                        "p-4 border-b border-luxury-gray/30 flex items-start gap-4 hover:bg-white/5 transition-colors",
                        idx === 0 && log.status !== 'system' && "bg-emerald-500/5",
                        log.status === 'system' && "bg-black/20 opacity-80"
                      )}
                    >
                      <div className="mt-1">{getStatusIcon(log.status)}</div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className={cn(
                            "font-bold",
                            log.status === 'system' ? "text-gray-500 italic text-xs" : "text-gold"
                          )}>
                            {log.status === 'system' ? "SYSTEM" : `[${log.customerName}]`}
                          </span>
                          <span className="text-[10px] text-gray-500">
                            {log.timestamp?.toDate ? format(log.timestamp.toDate(), 'HH:mm:ss') : '--:--:--'}
                          </span>
                        </div>
                        <div className={cn(
                          "leading-relaxed whitespace-pre-wrap",
                          log.status === 'system' ? "text-gray-500 text-xs italic" : "text-gray-300 text-sm"
                        )}>
                          {log.message}
                        </div>
                        {log.status !== 'system' && (
                          <div className="pt-2">
                            {getStatusBadge(log.status)}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {logs.length === 0 && (
                  <div className="p-12 text-center text-gray-500 italic">
                    Waiting for new bookings to automate...
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Workflow Info */}
        <div className="space-y-6">
          <Card className="luxury-card border-none bg-gradient-to-br from-luxury-charcoal to-luxury-black">
            <CardHeader>
              <CardTitle className="text-xl font-serif">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={createTestBooking}
                className="w-full bg-gold text-luxury-black font-bold hover:opacity-90 flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Send Test Booking
              </Button>
              <Button 
                onClick={clearLogs}
                variant="outline"
                className="w-full border-red-500/50 text-red-500 hover:bg-red-500/10 flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" /> Clear All Logs
              </Button>
              <p className="text-[10px] text-gray-500 text-center px-4">
                Creates a "Pending" booking to trigger the AI confirmation workflow.
              </p>
            </CardContent>
          </Card>

          <Card className="luxury-card border-none bg-gradient-to-br from-luxury-charcoal to-luxury-black">
            <CardHeader>
              <CardTitle className="text-xl font-serif">Automation Workflow</CardTitle>
            </CardHeader>
            <CardContent className="space-y-8 relative">
              <div className="absolute left-[34px] top-12 bottom-12 w-0.5 bg-luxury-gray" />
              
              <div className="flex gap-4 relative">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30 z-10 bg-luxury-black">
                  <span className="font-bold text-blue-400">1</span>
                </div>
                <div>
                  <h4 className="font-bold">Stage 1: Reading</h4>
                  <p className="text-xs text-gray-400 mt-1">AI reviews booking details and guest history.</p>
                  <p className="text-[10px] text-gold mt-1 font-mono uppercase tracking-tighter">Wait time: 1 Minute</p>
                </div>
              </div>

              <div className="flex gap-4 relative">
                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center border border-purple-500/30 z-10 bg-luxury-black">
                  <span className="font-bold text-purple-400">2</span>
                </div>
                <div>
                  <h4 className="font-bold">Stage 2: Preparation</h4>
                  <p className="text-xs text-gray-400 mt-1">Drafting confirmation email & verifying room availability.</p>
                  <p className="text-[10px] text-gold mt-1 font-mono uppercase tracking-tighter">Wait time: 1 Minute</p>
                </div>
              </div>

              <div className="flex gap-4 relative">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30 z-10 bg-luxury-black">
                  <Eye className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h4 className="font-bold">Stage 3: Review Ready</h4>
                  <p className="text-xs text-gray-400 mt-1">AI has finished its task. Status remains PENDING for manual admin confirmation.</p>
                  <p className="text-[10px] text-green-400 mt-1 font-mono uppercase tracking-tighter">Status: Action Required</p>
                </div>
              </div>

              <div className="flex gap-4 relative">
                <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center border border-gold/30 z-10 bg-luxury-black">
                  <CheckCircle2 className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <h4 className="font-bold">Manual Decision</h4>
                  <p className="text-xs text-gray-400 mt-1">Admin selects "Quick Confirm" or "Review & Email" to finalize.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="luxury-card border-none bg-gold/5">
            <CardContent className="p-6">
              <h4 className="font-bold text-gold mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4" /> System Timing
              </h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                Automations run in a strict sequential loop. New "Pending" bookings will begin the 3-minute lifecycle as soon as detected.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
