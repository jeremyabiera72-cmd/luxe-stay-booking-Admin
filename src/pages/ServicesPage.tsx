import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Coffee,
  Utensils,
  Car,
  Wifi,
  Waves,
  Sparkles
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
import { toast } from 'sonner';

interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  icon: string;
}

const ICON_MAP: Record<string, any> = {
  Coffee,
  Utensils,
  Car,
  Wifi,
  Waves,
  Sparkles
};

export const ServicesPage: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentService, setCurrentService] = useState<Partial<Service>>({
    name: '',
    description: '',
    price: 0,
    category: 'Amenities',
    icon: 'Wifi'
  });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'services'), (snap) => {
      setServices(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'services');
    });
    return () => unsub();
  }, []);

  const handleSave = async () => {
    if (!currentService.name || currentService.price === undefined) {
      toast.error('Please fill in required fields');
      return;
    }

    try {
      if (isEditing && currentService.id) {
        await updateDoc(doc(db, 'services', currentService.id), currentService);
        toast.success('Service updated');
      } else {
        await addDoc(collection(db, 'services'), {
          ...currentService,
          createdAt: serverTimestamp()
        });
        toast.success('Service added');
      }
      setIsAddDialogOpen(false);
      resetForm();
    } catch (error) {
      handleFirestoreError(error, isEditing ? OperationType.UPDATE : OperationType.CREATE, isEditing ? `services/${currentService.id}` : 'services');
      toast.error('Failed to save service');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this service?')) {
      try {
        await deleteDoc(doc(db, 'services', id));
        toast.success('Service deleted');
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `services/${id}`);
        toast.error('Failed to delete service');
      }
    }
  };

  const resetForm = () => {
    setCurrentService({
      name: '',
      description: '',
      price: 0,
      category: 'Amenities',
      icon: 'Wifi'
    });
    setIsEditing(false);
  };

  const filteredServices = services.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input 
            placeholder="Search services..." 
            className="luxury-input pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger render={<Button className="bg-gold text-luxury-black font-bold" />}>
            <Plus className="w-4 h-4 mr-2" /> Add Service
          </DialogTrigger>
          <DialogContent className="luxury-card border-gold/20 text-white">
            <DialogHeader>
              <DialogTitle className="text-2xl font-serif">{isEditing ? 'Edit Service' : 'Add New Service'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm text-gray-400">Service Name</label>
                <Input 
                  value={currentService.name}
                  onChange={(e) => setCurrentService({...currentService, name: e.target.value})}
                  className="luxury-input"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-gray-400">Price</label>
                  <Input 
                    type="number"
                    value={currentService.price}
                    onChange={(e) => setCurrentService({...currentService, price: Number(e.target.value)})}
                    className="luxury-input"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-400">Category</label>
                  <Select 
                    value={currentService.category}
                    onValueChange={(val) => setCurrentService({...currentService, category: val})}
                  >
                    <SelectTrigger className="luxury-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-luxury-charcoal border-luxury-gray text-white">
                      <SelectItem value="Amenities">Amenities</SelectItem>
                      <SelectItem value="Dining">Dining</SelectItem>
                      <SelectItem value="Wellness">Wellness</SelectItem>
                      <SelectItem value="Transport">Transport</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-400">Icon</label>
                <div className="flex gap-2 flex-wrap">
                  {Object.keys(ICON_MAP).map(iconName => {
                    const Icon = ICON_MAP[iconName];
                    return (
                      <button
                        key={iconName}
                        onClick={() => setCurrentService({...currentService, icon: iconName})}
                        className={`p-3 rounded-lg border transition-all ${
                          currentService.icon === iconName 
                            ? 'bg-gold/20 border-gold text-gold' 
                            : 'bg-luxury-gray border-transparent text-gray-400 hover:border-gray-600'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-400">Description</label>
                <Textarea 
                  value={currentService.description}
                  onChange={(e) => setCurrentService({...currentService, description: e.target.value})}
                  className="luxury-input min-h-[100px]"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="border-luxury-gray">
                Cancel
              </Button>
              <Button onClick={handleSave} className="bg-gold text-luxury-black font-bold">
                {isEditing ? 'Update Service' : 'Create Service'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredServices.map((service) => {
          const Icon = ICON_MAP[service.icon] || Wifi;
          return (
            <Card key={service.id} className="luxury-card border-none group hover:shadow-lg hover:shadow-gold/5 transition-all">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 rounded-xl bg-gold/10 text-gold">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                      size="icon-sm" 
                      variant="ghost"
                      onClick={() => {
                        setCurrentService(service);
                        setIsEditing(true);
                        setIsAddDialogOpen(true);
                      }}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button 
                      size="icon-sm" 
                      variant="ghost"
                      className="text-red-400"
                      onClick={() => handleDelete(service.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <h3 className="text-xl font-serif font-bold mb-1">{service.name}</h3>
                <p className="text-xs text-gold uppercase tracking-widest mb-3">{service.category}</p>
                <p className="text-gray-400 text-sm mb-4 line-clamp-2">{service.description}</p>
                <div className="flex justify-between items-center pt-4 border-t border-luxury-gray">
                  <span className="text-gray-500 text-xs uppercase">Price</span>
                  <span className="text-xl font-bold text-white">${service.price}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
