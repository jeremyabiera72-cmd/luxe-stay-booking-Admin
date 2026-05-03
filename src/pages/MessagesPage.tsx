import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { Mail, Trash2, CheckCircle, Clock, User, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  name: string;
  email: string;
  message: string;
  read: boolean;
  createdAt: any;
}

export const MessagesPage: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'contacts'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'contacts');
    });
    return () => unsub();
  }, []);

  const toggleRead = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'contacts', id), { read: !currentStatus });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `contacts/${id}`);
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this message?')) {
      try {
        await deleteDoc(doc(db, 'contacts', id));
        toast.success('Message deleted');
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `contacts/${id}`);
        toast.error('Failed to delete message');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4">
        {messages.map((msg) => (
          <Card 
            key={msg.id} 
            className={cn(
              "luxury-card border-none transition-all",
              !msg.read ? "bg-gold/5 border-l-4 border-l-gold" : "opacity-80"
            )}
          >
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-luxury-gray flex items-center justify-center text-gold">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-lg flex items-center gap-2">
                          {msg.name}
                          {!msg.read && <Badge className="bg-gold text-luxury-black text-[10px] h-4">New</Badge>}
                        </h4>
                        <p className="text-sm text-gray-500">{msg.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 uppercase tracking-widest">
                        {msg.createdAt?.toDate ? format(msg.createdAt.toDate(), 'MMM d, yyyy • HH:mm') : 'N/A'}
                      </p>
                    </div>
                  </div>
                  <p className="text-gray-300 leading-relaxed bg-luxury-black/30 p-4 rounded-lg border border-luxury-gray/50">
                    {msg.message}
                  </p>
                </div>
                <div className="flex md:flex-col justify-end gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className={cn(
                      "flex-1 md:flex-none justify-start",
                      msg.read ? "text-gray-500" : "text-gold hover:text-gold-light"
                    )}
                    onClick={() => toggleRead(msg.id, msg.read)}
                  >
                    {msg.read ? <Clock className="w-4 h-4 mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                    {msg.read ? 'Mark Unread' : 'Mark Read'}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="flex-1 md:flex-none justify-start text-red-400 hover:text-red-300 hover:bg-red-400/10"
                    onClick={() => handleDelete(msg.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {messages.length === 0 && (
          <div className="py-20 text-center">
            <MessageSquare className="w-12 h-12 text-luxury-gray mx-auto mb-4" />
            <h3 className="text-xl font-serif text-gray-400">No messages yet</h3>
            <p className="text-gray-500">Guest inquiries will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
};
