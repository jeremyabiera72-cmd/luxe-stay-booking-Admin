import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, updateDoc, doc, query, orderBy, addDoc, serverTimestamp, getDocs, limit as firestoreLimit } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '@/lib/firebase';
import { 
  Plus,
  Search, 
  Filter, 
  Calendar, 
  User, 
  Mail, 
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  BedDouble,
  CalendarCheck,
  Trash2,
  PackagePlus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { deleteDoc } from 'firebase/firestore';

interface Booking {
  id: string;
  customerName: string;
  customerEmail: string;
  resourceId: string;
  roomName: string;
  checkIn: any;
  checkOut: any;
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: any;
}

export const BookingsPage: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    const q = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setBookings(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'bookings');
    });
    return () => unsub();
  }, []);

  const updateStatus = async (id: string, status: string, resourceId?: string) => {
    try {
      await updateDoc(doc(db, 'bookings', id), { status });
      
      // Also update room status if confirmed
      if (status === 'confirmed' && resourceId) {
        await updateDoc(doc(db, 'rooms', resourceId), { status: 'booked' });
      }
      
      toast.success(`Booking ${status === 'confirmed' ? 'Finalized' : status}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `bookings/${id}`);
      toast.error('Failed to update status');
    }
  };

  const deleteBooking = async (id: string) => {
    // Proceed directly to avoid iframe confirm() blocks
    const toastId = toast.loading('Deleting booking...');
    try {
      await deleteDoc(doc(db, 'bookings', id));
      toast.success('Booking deleted successfully', { id: toastId });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `bookings/${id}`);
      toast.error('Failed to delete booking', { id: toastId });
    }
  };

  const confirmWithEmail = async (booking: Booking) => {
    const toastId = toast.loading('Sending confirmation email and finalizing...');
    try {
      const response = await fetch('/api/bookings/confirm-with-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId: booking.id,
          customerEmail: booking.customerEmail,
          customerName: booking.customerName,
          roomName: booking.roomName,
          checkIn: booking.checkIn?.toDate ? format(booking.checkIn.toDate(), 'MMM d, yyyy') : 'TBD',
          checkOut: booking.checkOut?.toDate ? format(booking.checkOut.toDate(), 'MMM d, yyyy') : 'TBD',
          totalAmount: booking.totalAmount,
          resourceId: booking.resourceId,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Server failed to send email');
      }

      // 2. Finalize the reservation in Firestore directly from the Client
      // This uses the authenticated admin's credentials, satisfying security rules.
      await updateStatus(booking.id, 'confirmed', booking.resourceId);

      toast.success('Email sent and booking confirmed!', { id: toastId });
    } catch (error: any) {
      toast.error('Error: ' + error.message, { id: toastId });
    }
  };

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = 
      booking.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.customerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.roomName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const createNewPendingBooking = async () => {
    const toastId = toast.loading('Creating new pending booking for Jeremy...');
    try {
      // Find an available room
      const roomsSnap = await getDocs(query(collection(db, 'rooms'), firestoreLimit(1)));
      const room = roomsSnap.docs[0]?.data();
      const roomId = roomsSnap.docs[0]?.id || 'room-temp';
      const roomName = room?.name || 'Standard Room';

      await addDoc(collection(db, 'bookings'), {
        customerName: "Jeremy Abiera",
        customerEmail: "jeremyabiera72@gmail.com",
        resourceId: roomId,
        roomName: roomName,
        status: "pending",
        aiReviewStatus: "none", // Explicitly set to 'none' for clarity
        checkIn: serverTimestamp(),
        checkOut: serverTimestamp(),
        totalAmount: 12500, // Higher amount for luxury feel
        createdAt: serverTimestamp()
      });
      toast.success('New PENDING booking created for Jeremy!', { id: toastId });
    } catch (error: any) {
      handleFirestoreError(error, OperationType.CREATE, 'bookings');
      toast.error('Failed to create booking: ' + error.message, { id: toastId });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-serif font-bold">Reservations</h1>
          <p className="text-sm text-gray-400">Manage guest bookings and confirmations</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button 
            variant="ghost"
            onClick={async () => {
              const snap = await getDocs(collection(db, 'bookings'));
              const deletes = snap.docs.map(d => deleteDoc(d.ref));
              await Promise.all(deletes);
              toast.success('System purged. All old records removed.');
            }}
            className="text-red-400 hover:text-red-300 hover:bg-red-400/10 text-[10px] h-8"
          >
            Clear All Data
          </Button>
          <Button 
            onClick={createNewPendingBooking}
            className="bg-gold text-luxury-black font-bold h-10 hover:opacity-90 shadow-[0_0_20px_rgba(212,175,55,0.2)]"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Reservation
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 justify-between">
        <div className="flex flex-1 gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input 
              placeholder="Search by guest or room..." 
              className="luxury-input pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 luxury-input">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-luxury-charcoal border-luxury-gray text-white">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Finalized</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Filter className="w-4 h-4" />
          <span>Showing {filteredBookings.length} bookings</span>
        </div>
      </div>

      {/* Bookings List */}
      <div className="space-y-4">
        {filteredBookings.map((booking) => (
          <Card key={booking.id} className="luxury-card border-none hover:border-gold/20 transition-all group">
            <CardContent className="p-8">
              <div className="flex flex-col xl:flex-row justify-between gap-8">
                {/* Left Side: Guest & Room Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1">
                  {/* Guest */}
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-luxury-gray flex items-center justify-center shrink-0 border border-gold/10">
                      <User className="w-6 h-6 text-gold" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-bold mb-1">Guest Info</p>
                      <h3 className="text-lg font-serif font-bold text-white leading-tight">{booking.customerName}</h3>
                      <p className="text-sm text-gray-400 mt-0.5">{booking.customerEmail}</p>
                    </div>
                  </div>

                  {/* Room & Dates */}
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-luxury-gray flex items-center justify-center shrink-0 border border-gold/10">
                      <BedDouble className="w-6 h-6 text-gold" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-bold mb-1">Reservation</p>
                      <h3 className="text-base font-serif font-bold text-white">{booking.roomName}</h3>
                      <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {booking.checkIn?.toDate ? format(booking.checkIn.toDate(), 'MMM d') : 'N/A'} - 
                        {booking.checkOut?.toDate ? format(booking.checkOut.toDate(), 'MMM d, yyyy') : 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Side: Stacked Actions (Matches Request Image) */}
                <div className="flex flex-col md:flex-row items-start md:items-center xl:items-end xl:flex-col gap-6">
                  {/* Amount & Status Pill - Stacked on the Left of buttons horizontally */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-gold" />
                      <span className="text-3xl font-bold text-gold tracking-tight">
                        ${booking.totalAmount?.toLocaleString()}
                      </span>
                    </div>
                    <div className="pl-7">
                      <Badge 
                        className={cn(
                          "px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                          booking.status === 'confirmed' ? "bg-green-500/10 text-green-500 border-green-500/30" :
                          booking.status === 'pending' ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/30" :
                          "bg-red-500/10 text-red-500 border-red-500/30"
                        )}
                      >
                        {booking.status === 'confirmed' ? 'Finalized' : booking.status}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-3">
                    {/* The Grouped Review Bar */}
                    {booking.status === 'pending' && (
                      <div className="flex items-center bg-luxury-charcoal/40 backdrop-blur-sm border border-gold/20 rounded-xl overflow-hidden shadow-2xl">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => confirmWithEmail(booking)}
                          className="h-10 px-5 text-gold hover:bg-gold/10 transition-colors font-bold gap-2 rounded-none"
                        >
                          <Mail className="w-4 h-4" />
                          <span className="text-xs">1. Review & Email</span>
                        </Button>
                        <div className="w-[1px] h-6 bg-luxury-gray" />
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => updateStatus(booking.id, 'confirmed', booking.resourceId)}
                          className="h-10 px-5 text-green-500 hover:bg-green-500/10 transition-colors font-bold gap-2 rounded-none"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span className="text-xs">2. Finalize Reservation</span>
                        </Button>
                      </div>
                    )}

                    {booking.status === 'confirmed' && (
                      <div className="flex flex-col items-end gap-2">
                        <div className="h-10 px-6 flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-xl text-green-500 font-bold">
                          <CheckCircle2 className="w-5 h-5" />
                          <span className="text-sm uppercase tracking-widest text-xs font-serif">Finalized Reservation</span>
                        </div>
                        <button 
                          onClick={() => updateStatus(booking.id, 'pending')}
                          className="text-[10px] text-gray-500 hover:text-white uppercase tracking-tighter"
                        >
                          Restore to Pending
                        </button>
                      </div>
                    )}

                    {/* Desktop/Tablet Destructive Row (Cancel/Delete) */}
                    <div className="flex items-center gap-4 text-xs font-medium">
                      {(booking.status === 'pending' || booking.status === 'confirmed') && (
                        <button 
                          onClick={() => updateStatus(booking.id, 'cancelled')}
                          className="flex items-center gap-1.5 text-red-400 hover:text-red-300 transition-colors"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>Cancel</span>
                        </button>
                      )}

                      {booking.status === 'cancelled' && (
                        <button 
                          onClick={() => updateStatus(booking.id, 'pending')}
                          className="flex items-center gap-1.5 text-yellow-400 hover:text-yellow-300 transition-colors"
                        >
                          <Clock className="w-4 h-4" />
                          <span>Restore</span>
                        </button>
                      )}

                      <div className="w-[1px] h-3 bg-luxury-gray" />

                      <button 
                        onClick={() => deleteBooking(booking.id)}
                        className="flex items-center gap-1.5 text-gray-500 hover:text-white transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredBookings.length === 0 && (
          <div className="py-20 text-center">
            <CalendarCheck className="w-12 h-12 text-luxury-gray mx-auto mb-4" />
            <h3 className="text-xl font-serif text-gray-400">No bookings found</h3>
            <p className="text-gray-500">Try adjusting your filters or search term.</p>
          </div>
        )}
      </div>
    </div>
  );
};
