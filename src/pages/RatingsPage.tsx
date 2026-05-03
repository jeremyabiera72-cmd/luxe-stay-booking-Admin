import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { Star, Trash2, User, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Review {
  id: string;
  customerName: string;
  rating: number;
  comment: string;
  resourceId: string;
  createdAt: any;
}

export const RatingsPage: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'reviews'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setReviews(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'reviews');
    });
    return () => unsub();
  }, []);

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this review?')) {
      try {
        await deleteDoc(doc(db, 'reviews', id));
        toast.success('Review deleted');
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `reviews/${id}`);
        toast.error('Failed to delete review');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reviews.map((review) => (
          <Card key={review.id} className="luxury-card border-none group">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-luxury-gray flex items-center justify-center text-gold font-bold">
                    {review.customerName.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold">{review.customerName}</h4>
                    <div className="flex items-center gap-1 text-[10px] text-gray-500 uppercase tracking-widest">
                      <Calendar className="w-3 h-3" />
                      {review.createdAt?.toDate ? format(review.createdAt.toDate(), 'MMM d, yyyy') : 'N/A'}
                    </div>
                  </div>
                </div>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleDelete(review.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="flex gap-1 mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={i} 
                    className={cn(
                      "w-4 h-4",
                      i < review.rating ? "text-gold fill-gold" : "text-gray-600"
                    )} 
                  />
                ))}
              </div>

              <p className="text-gray-300 text-sm italic leading-relaxed">
                "{review.comment}"
              </p>
            </CardContent>
          </Card>
        ))}

        {reviews.length === 0 && (
          <div className="col-span-full py-20 text-center">
            <Star className="w-12 h-12 text-luxury-gray mx-auto mb-4" />
            <h3 className="text-xl font-serif text-gray-400">No reviews yet</h3>
            <p className="text-gray-500">Guest feedback will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
};
