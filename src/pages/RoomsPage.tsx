import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, getDocs, getDocsFromServer } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, auth, handleFirestoreError, OperationType } from '@/lib/firebase';
import { motion } from 'motion/react';
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  Image as ImageIcon,
  Check,
  X,
  Upload,
  BedDouble
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Room {
  id: string;
  name: string;
  roomNumber: string;
  type: string;
  pricePerNight: number;
  description: string;
  imageUrl: string;
  status: 'available' | 'booked' | 'maintenance';
  features: string[];
}

export const RoomsPage: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentRoom, setCurrentRoom] = useState<Partial<Room>>({
    name: '',
    roomNumber: '',
    type: 'Deluxe',
    pricePerNight: 0,
    description: '',
    imageUrl: '',
    status: 'available',
    features: []
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'rooms'), (snap) => {
      setRooms(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Room)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'rooms');
    });
    return () => unsub();
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleSave = async () => {
    if (!auth.currentUser) {
      toast.error('Session expired. Please log in again.');
      return;
    }

    // Improved validation
    const name = currentRoom.name?.trim();
    const roomNumber = currentRoom.roomNumber?.trim();
    const price = Number(currentRoom.pricePerNight);

    if (!name || !roomNumber || isNaN(price)) {
      toast.error('Please fill in all required fields (Name, Number, and Price)');
      return;
    }

    setUploading(true);
    const toastId = toast.loading(isEditing ? 'Updating room...' : 'Adding room...');
    console.log('Starting room save process...', { isEditing, currentRoom, uid: auth.currentUser.uid });

    try {
      let imageUrl = currentRoom.imageUrl || '';

      if (imageFile) {
        console.log('Uploading image...', imageFile.name, 'Size:', imageFile.size);
        if (imageFile.size > 5 * 1024 * 1024) { // 5MB limit
          throw new Error('Image size too large. Please use an image under 5MB.');
        }

        try {
          const storageRef = ref(storage, `rooms/${Date.now()}_${imageFile.name}`);
          const uploadTask = await uploadBytes(storageRef, imageFile);
          imageUrl = await getDownloadURL(uploadTask.ref);
          console.log('Image uploaded successfully:', imageUrl);
        } catch (storageError: any) {
          console.error('Storage error:', storageError);
          throw new Error(`Image upload failed: ${storageError.message}`);
        }
      }

      // Prepare clean data for Firestore
      const roomData: any = {
        name,
        roomNumber,
        type: currentRoom.type || 'Deluxe',
        pricePerNight: price,
        description: currentRoom.description || '',
        imageUrl,
        status: currentRoom.status || 'available',
        features: currentRoom.features || [],
        updatedAt: serverTimestamp()
      };

      if (isEditing && currentRoom.id) {
        console.log('Updating existing room:', currentRoom.id);
        await updateDoc(doc(db, 'rooms', currentRoom.id), roomData);
        toast.success('Room updated successfully', { id: toastId });
      } else {
        console.log('Adding new room');
        await addDoc(collection(db, 'rooms'), {
          ...roomData,
          createdAt: serverTimestamp()
        });
        toast.success('Room added successfully', { id: toastId });
      }

      setIsAddDialogOpen(false);
      resetForm();
    } catch (error: any) {
      console.error('Save error details:', error);
      handleFirestoreError(error, isEditing ? OperationType.UPDATE : OperationType.CREATE, isEditing ? `rooms/${currentRoom.id}` : 'rooms');
      let message = error.message || 'Failed to save room';
      
      if (error.code === 'permission-denied' || error.message?.includes('permission-denied')) {
        message = 'Permission denied. Please ensure you are logged in as admin.';
      } else if (error.code === 'storage/unauthorized') {
        message = 'Storage permission denied. Please check storage rules.';
      }

      toast.error(message, { id: toastId });
    } finally {
      setUploading(false);
      console.log('Room save process finished.');
    }
  };

  const handleDelete = async (id: string, roomName: string) => {
    // We'll proceed directly to avoid window.confirm issues in iframes
    const toastId = toast.loading(`Deleting ${roomName}...`);
    try {
      console.log(`Starting deletion for room: ${id}`);
      await deleteDoc(doc(db, 'rooms', id));
      console.log('Deletion successful');
      toast.success(`${roomName} deleted successfully`, { id: toastId });
    } catch (error: any) {
      console.error('Delete error details:', error);
      handleFirestoreError(error, OperationType.DELETE, `rooms/${id}`);
      let message = `Failed to delete: ${error.message || 'Unknown error'}`;
      if (error.code === 'permission-denied') {
        message = 'Admin permissions required (Permission Denied)';
      }
      toast.error(message, { id: toastId });
    }
  };

  const resetForm = () => {
    setCurrentRoom({
      name: '',
      roomNumber: '',
      type: 'Deluxe',
      pricePerNight: 0,
      description: '',
      imageUrl: '',
      status: 'available',
      features: []
    });
    setImageFile(null);
    setIsEditing(false);
  };

  const seedDummyData = async () => {
    if (!auth.currentUser) return;
    const toastId = toast.loading('Seeding dummy rooms...');
    try {
      const roomsData = [
        // 10 Available Rooms
        { name: "Ocean Deluxe", roomNumber: "101", type: "Deluxe", pricePerNight: 450, status: "available", description: "Breathtaking ocean views with a king-sized bed.", features: ["Ocean View", "King Bed", "Mini Bar"], imageUrl: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80" },
        { name: "Garden Standard", roomNumber: "102", type: "Standard", pricePerNight: 200, status: "available", description: "Quiet room overlooking the lush hotel gardens.", features: ["Garden View", "Queen Bed", "Wifi"], imageUrl: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80" },
        { name: "Skyline Suite", roomNumber: "201", type: "Suite", pricePerNight: 850, status: "available", description: "Top-floor suite with panoramic city skyline views.", features: ["Skyline View", "Living Area", "Balcony"], imageUrl: "https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=800&q=80" },
        { name: "Mountain View", roomNumber: "202", type: "Standard", pricePerNight: 220, status: "available", description: "Cozy room with direct views of the distant mountains.", features: ["Mountain View", "Twin Beds", "Desk"], imageUrl: "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=800&q=80" },
        { name: "Royal Presidential", roomNumber: "501", type: "Presidential", pricePerNight: 3500, status: "available", description: "The ultimate luxury experience with private butler service.", features: ["Private Pool", "Butler Service", "Gourmet Kitchen"], imageUrl: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80" },
        { name: "Family Comfort", roomNumber: "103", type: "Standard", pricePerNight: 300, status: "available", description: "Spacious room designed for families with kids.", features: ["Two Queen Beds", "Kid-Friendly", "Fridge"], imageUrl: "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=800&q=80" },
        { name: "Business Deluxe", roomNumber: "301", type: "Deluxe", pricePerNight: 480, status: "available", description: "Perfect for business travelers with high-speed internet.", features: ["Gigabit Wifi", "Ergonomic Chair", "Safe"], imageUrl: "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=800&q=80" },
        { name: "Sunset Terrace", roomNumber: "302", type: "Suite", pricePerNight: 950, status: "available", description: "Suite with a large terrace perfect for sunset viewing.", features: ["Terrace", "Outdoor Seating", "Wine Cooler"], imageUrl: "https://images.unsplash.com/photo-1590490359683-658d3d23f972?auto=format&fit=crop&w=800&q=80" },
        { name: "Zen Minimalist", roomNumber: "401", type: "Deluxe", pricePerNight: 420, status: "available", description: "Relaxing minimalist design for a peaceful stay.", features: ["Zen Decor", "Soaking Tub", "Organic Linens"], imageUrl: "https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=800&q=80" },
        { name: "Harmony Standard", roomNumber: "402", type: "Standard", pricePerNight: 210, status: "available", description: "Well-balanced room with modern amenities.", features: ["Smart TV", "Coffee Maker", "USB Ports"], imageUrl: "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=800&q=80" },

        // 5 Booked Rooms
        { name: "Coral Deluxe", roomNumber: "203", type: "Deluxe", pricePerNight: 460, status: "booked", description: "Popular choice for weekend getaways.", features: ["Pool Access", "King Bed"], imageUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80" },
        { name: "Azure Suite", roomNumber: "204", type: "Suite", pricePerNight: 820, status: "booked", description: "Elegant suite with deep blue maritime theme.", features: ["Lounge Access", "Premium Sound System"], imageUrl: "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=800&q=80" },
        { name: "Urban Standard", roomNumber: "303", type: "Standard", pricePerNight: 250, status: "booked", description: "Modern urban design in the heart of the hotel.", features: ["City View", "Queen Bed"], imageUrl: "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=800&q=80" },
        { name: "Emerald Deluxe", roomNumber: "304", type: "Deluxe", pricePerNight: 490, status: "booked", description: "Luxurious room with emerald stone accents.", features: ["Rain Shower", "Mini Bar"], imageUrl: "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80" },
        { name: "Pearl Suite", roomNumber: "403", type: "Suite", pricePerNight: 900, status: "booked", description: "Sophisticated suite for special occasions.", features: ["Jacuzzi", "Champagne Service"], imageUrl: "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=800&q=80" },

        // 3 Maintenance Rooms
        { name: "Terrace Classic", roomNumber: "105", type: "Standard", pricePerNight: 180, status: "maintenance", description: "Undergoing floor renovation.", features: ["Terrace", "Queen Bed"], imageUrl: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80" },
        { name: "Regency Suite", roomNumber: "305", type: "Suite", pricePerNight: 880, status: "maintenance", description: "AC system upgrade in progress.", features: ["Historical Decor", "Large Living Area"], imageUrl: "https://images.unsplash.com/photo-1566195992011-5f6b21e539aa?auto=format&fit=crop&w=800&q=80" },
        { name: "Grand Imperial", roomNumber: "502", type: "Presidential", pricePerNight: 3200, status: "maintenance", description: "Annual pool maintenance.", features: ["Private Balcony", "Walk-in Closet"], imageUrl: "https://images.unsplash.com/photo-1571011264250-9856f70914fe?auto=format&fit=crop&w=800&q=80" }
      ];

      for (const room of roomsData) {
        await addDoc(collection(db, 'rooms'), {
          ...room,
          createdAt: serverTimestamp()
        });
      }
      toast.success('18 Dummy rooms added successfully!', { id: toastId });
    } catch (error: any) {
      console.error('Seed error:', error);
      toast.error('Failed to seed rooms: ' + error.message, { id: toastId });
    }
  };

  const clearAllRooms = async () => {
    console.log('Master Reset triggered from RoomsPage');
    if (!auth.currentUser) {
      toast.error('Authentication required.');
      return;
    }

    const toastId = toast.loading('Wiping ALL system data (Rooms, Bookings, Reports, etc)...');
    try {
      const collectionNames = ['rooms', 'bookings', 'reports', 'reviews', 'contacts', 'services'] as const;
      let totalDeleted = 0;

      for (const colName of collectionNames) {
        console.log(`Clearing ${colName}...`);
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
      
      toast.success(`System Reset Success: ${totalDeleted} documents removed.`, { id: toastId });
      
      // Reload page to clear any cached data in React state
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error: any) {
      console.error('Master Reset error:', error);
      toast.error(`Reset failed: ${error.message || 'Unknown error'}`, { id: toastId });
    }
  };

  const filteredRooms = rooms.filter(room => 
    room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    room.roomNumber.includes(searchTerm)
  );

  return (
    <div className="space-y-10">
      {/* Header Actions */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-4xl font-serif text-white tracking-tight">The Suite Collection</h1>
          <p className="text-gray-500 text-sm tracking-[0.2em] uppercase font-medium">Manage and curate hotel accommodations</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input 
              placeholder="Filter by name or number..." 
              className="luxury-input pl-12 h-12 bg-white/[0.02] border-white/5 focus:border-gold/30 rounded-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
            setIsAddDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger render={<Button className="bg-gold text-luxury-black font-bold h-12 px-6 rounded-full hover:opacity-90 transition-all shadow-[0_4px_20px_rgba(197,160,89,0.2)]" />}>
              <Plus className="w-4 h-4 mr-2" /> Register Suite
            </DialogTrigger>
            <DialogContent className="luxury-card border-white/10 max-w-2xl text-white p-0">
              <DialogHeader className="p-8 border-b border-white/5">
                <DialogTitle className="text-3xl font-serif text-gold">{isEditing ? 'Curate Suite' : 'Register New Suite'}</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8">
                <div className="space-y-6">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-500 ml-1">Suite Designation</label>
                    <Input 
                      value={currentRoom.name} 
                      onChange={(e) => setCurrentRoom({...currentRoom, name: e.target.value})}
                      className="luxury-input h-10" 
                      placeholder="e.g. Royal Ocean Suite"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-500 ml-1">Number</label>
                      <Input 
                        value={currentRoom.roomNumber} 
                        onChange={(e) => setCurrentRoom({...currentRoom, roomNumber: e.target.value})}
                        className="luxury-input h-10" 
                        placeholder="301"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-500 ml-1">Price (USD)</label>
                      <Input 
                        type="number"
                        value={currentRoom.pricePerNight} 
                        onChange={(e) => setCurrentRoom({...currentRoom, pricePerNight: Number(e.target.value)})}
                        className="luxury-input h-10" 
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-500 ml-1">Classification</label>
                    <Select 
                      value={currentRoom.type} 
                      onValueChange={(val) => setCurrentRoom({...currentRoom, type: val})}
                    >
                      <SelectTrigger className="luxury-input h-10">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent className="bg-luxury-charcoal border-white/10 text-white">
                        <SelectItem value="Standard">Standard</SelectItem>
                        <SelectItem value="Deluxe">Deluxe</SelectItem>
                        <SelectItem value="Suite">Suite</SelectItem>
                        <SelectItem value="Presidential">Presidential</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-500 ml-1">Current Status</label>
                    <Select 
                      value={currentRoom.status} 
                      onValueChange={(val: any) => setCurrentRoom({...currentRoom, status: val})}
                    >
                      <SelectTrigger className="luxury-input h-10">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent className="bg-luxury-charcoal border-white/10 text-white">
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="booked">Booked</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-500 ml-1">Imagery</label>
                    <div className="border border-white/5 bg-white/[0.02] rounded-2xl p-4 text-center hover:border-gold/30 transition-all cursor-pointer relative overflow-hidden group aspect-video flex flex-col items-center justify-center">
                      <input 
                        type="file" 
                        accept="image/*"
                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                        onChange={handleImageChange}
                      />
                      {imageFile || currentRoom.imageUrl ? (
                        <div className="relative w-full h-full">
                          <img 
                            src={imageFile ? URL.createObjectURL(imageFile) : currentRoom.imageUrl} 
                            className="absolute inset-0 w-full h-full object-cover rounded-xl"
                          />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Upload className="w-6 h-6 text-white" />
                          </div>
                        </div>
                      ) : (
                        <div className="text-gray-500 group-hover:text-gold transition-colors">
                          <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="text-[9px] uppercase tracking-widest font-bold">Upload Portrait</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-500 ml-1">Narrative</label>
                    <ul className="text-xs text-gray-500 list-disc ml-4 space-y-1 mb-2">
                      <li>Describe the view and unique features</li>
                      <li>Highlight premium materials and design</li>
                    </ul>
                    <Textarea 
                      value={currentRoom.description} 
                      onChange={(e) => setCurrentRoom({...currentRoom, description: e.target.value})}
                      className="luxury-input h-24 resize-none text-xs" 
                      placeholder="The story of this suite..."
                    />
                  </div>
                </div>
              </div>
              <DialogFooter className="p-8 bg-white/[0.02] border-t border-white/5">
                <Button variant="ghost" onClick={() => setIsAddDialogOpen(false)} className="text-gray-500 uppercase tracking-widest text-[10px] font-bold hover:text-white">Withdraw</Button>
                <Button 
                  onClick={handleSave} 
                  disabled={uploading}
                  className="bg-gold text-luxury-black font-bold px-8 rounded-full"
                >
                  {uploading ? 'Processing...' : (isEditing ? 'Archive Changes' : 'Publish Suite')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex gap-4 border-b border-white/5 pb-4">
        <Button 
          variant="ghost" 
          onClick={seedDummyData}
          className="text-gold/60 hover:text-gold tracking-[0.2em] text-[10px] uppercase font-bold px-0 h-auto"
        >
          Seed Collection
        </Button>
        <span className="text-white/10">•</span>
        <Button 
          variant="ghost" 
          onClick={clearAllRooms}
          className="text-red-900 hover:text-red-500 tracking-[0.2em] text-[10px] uppercase font-bold px-0 h-auto"
        >
          Purge Register
        </Button>
      </div>

      {/* Rooms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
        {filteredRooms.map((room) => (
          <motion.div
            layout
            key={room.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="group relative"
          >
            <div className="relative aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl mb-6">
              <img 
                src={room.imageUrl || 'https://picsum.photos/seed/room/800/1000'} 
                alt={room.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000 ease-out"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-luxury-black via-transparent to-transparent opacity-60" />
              
              {/* Status Badge */}
              <div className="absolute top-6 left-6">
                <Badge className={cn(
                  "uppercase tracking-[0.2em] text-[9px] font-bold border-none px-3 py-1 rounded-none",
                  room.status === 'available' ? "bg-white text-luxury-black" :
                  room.status === 'booked' ? "bg-gold text-luxury-black" :
                  "bg-gray-700 text-white"
                )}>
                  {room.status}
                </Badge>
              </div>

              {/* Action Overlays */}
              <div className="absolute top-6 right-6 flex flex-col gap-3 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-4 group-hover:translate-x-0">
                <Button 
                  size="icon" 
                  variant="secondary" 
                  className="w-12 h-12 bg-white/10 backdrop-blur-xl border border-white/20 text-white hover:text-gold rounded-full"
                  onClick={() => {
                    setCurrentRoom(room);
                    setIsEditing(true);
                    setIsAddDialogOpen(true);
                  }}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button 
                  size="icon" 
                  className="w-12 h-12 bg-red-500/10 backdrop-blur-xl border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white rounded-full transition-all"
                  onClick={() => handleDelete(room.id, room.name)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              {/* Bottom Label Overlay */}
              <div className="absolute bottom-6 left-6 right-6">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <p className="text-gold text-[10px] uppercase tracking-[0.3em] font-bold">Suite {room.roomNumber}</p>
                    <p className="text-white text-2xl font-serif">${room.pricePerNight}</p>
                  </div>
                  <h3 className="text-3xl font-serif text-white group-hover:text-gold transition-colors duration-500">{room.name}</h3>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4 px-2">
              <p className="text-gray-500 text-sm leading-relaxed font-serif italic line-clamp-2">
                {room.description || 'A masterpiece of contemporary luxury design.'}
              </p>
              <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <div className="flex gap-4">
                  {room.features?.slice(0, 2).map((f, i) => (
                    <span key={i} className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">{f}</span>
                  ))}
                </div>
                <Button 
                  variant="ghost" 
                  className={cn(
                    "text-[10px] uppercase tracking-[0.2em] font-bold h-auto py-0 px-0",
                    room.status === 'available' ? "text-white hover:text-gold" : "text-gold hover:text-white"
                  )}
                  onClick={async () => {
                    try {
                      await updateDoc(doc(db, 'rooms', room.id), {
                        status: room.status === 'available' ? 'booked' : 'available'
                      });
                      toast.success(`Suite status updated.`);
                    } catch (err) {
                      handleFirestoreError(err, OperationType.UPDATE, `rooms/${room.id}`);
                    }
                  }}
                >
                  {room.status === 'available' ? 'Mark Booked' : 'Mark Available'}
                </Button>
              </div>
            </div>
          </motion.div>
        ))}

        {filteredRooms.length === 0 && (
          <div className="col-span-full py-20 text-center">
            <BedDouble className="w-12 h-12 text-luxury-gray mx-auto mb-4" />
            <h3 className="text-xl font-serif text-gray-400">No rooms found</h3>
            <p className="text-gray-500">Try adjusting your search or add a new room.</p>
          </div>
        )}
      </div>
    </div>
  );
};
