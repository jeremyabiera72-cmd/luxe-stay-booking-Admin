import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, updateDoc, deleteDoc, doc, query, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Plus, 
  Trash2, 
  MoreVertical,
  Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Report {
  id: string;
  title: string;
  content: string;
  status: 'open' | 'in-progress' | 'resolved';
  createdAt: any;
}

export const ReportsPage: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newReport, setNewReport] = useState({ title: '', content: '', status: 'open' as const });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setReports(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Report)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'reports');
    });
    return () => unsub();
  }, []);

  const handleAddReport = async () => {
    if (!newReport.title || !newReport.content) {
      toast.error('Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      await addDoc(collection(db, 'reports'), {
        ...newReport,
        createdAt: serverTimestamp()
      });
      toast.success('Report created');
      setIsAddDialogOpen(false);
      setNewReport({ title: '', content: '', status: 'open' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'reports');
      toast.error('Failed to create report');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await updateDoc(doc(db, 'reports', id), { status });
      toast.success(`Status updated to ${status}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `reports/${id}`);
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this report?')) {
      try {
        await deleteDoc(doc(db, 'reports', id));
        toast.success('Report deleted');
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `reports/${id}`);
        toast.error('Failed to delete report');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-serif text-gray-400">Maintenance & Issue Tracking</h3>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger render={<Button className="bg-gold text-luxury-black font-bold" />}>
            <Plus className="w-4 h-4 mr-2" /> New Report
          </DialogTrigger>
          <DialogContent className="luxury-card border-gold/20 text-white">
            <DialogHeader>
              <DialogTitle className="text-2xl font-serif">Create Issue Report</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Issue Title</label>
                <Input 
                  value={newReport.title} 
                  onChange={(e) => setNewReport({...newReport, title: e.target.value})}
                  className="luxury-input" 
                  placeholder="e.g. AC leaking in Room 302"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Content</label>
                <Textarea 
                  value={newReport.content} 
                  onChange={(e) => setNewReport({...newReport, content: e.target.value})}
                  className="luxury-input h-32" 
                  placeholder="Provide details about the issue..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Initial Status</label>
                <Select 
                  value={newReport.status} 
                  onValueChange={(val: any) => setNewReport({...newReport, status: val})}
                >
                  <SelectTrigger className="luxury-input">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent className="bg-luxury-charcoal border-luxury-gray text-white">
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsAddDialogOpen(false)} className="text-gray-400">Cancel</Button>
              <Button onClick={handleAddReport} disabled={loading} className="bg-gold text-luxury-black font-bold">
                {loading ? 'Creating...' : 'Create Report'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reports.map((report) => (
          <Card key={report.id} className="luxury-card border-none">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    report.status === 'open' ? "bg-red-500/10 text-red-500" :
                    report.status === 'in-progress' ? "bg-yellow-500/10 text-yellow-500" :
                    "bg-green-500/10 text-green-500"
                  )}>
                    {report.status === 'open' ? <AlertTriangle className="w-5 h-5" /> :
                     report.status === 'in-progress' ? <Clock className="w-5 h-5" /> :
                     <CheckCircle2 className="w-5 h-5" />}
                  </div>
                  <div>
                    <h4 className="font-bold text-lg">{report.title}</h4>
                    <p className="text-xs text-gray-500 uppercase tracking-widest">
                      {report.createdAt?.toDate ? format(report.createdAt.toDate(), 'MMM d, yyyy') : 'N/A'}
                    </p>
                  </div>
                </div>
                <Badge className={cn(
                  "capitalize font-normal border-none",
                  report.status === 'open' ? "bg-red-500 text-white" :
                  report.status === 'in-progress' ? "bg-yellow-500 text-white" :
                  "bg-green-500 text-white"
                )}>
                  {report.status}
                </Badge>
              </div>
              
              <p className="text-gray-400 text-sm mb-6 line-clamp-3">
                {report.content}
              </p>

              <div className="flex items-center justify-between pt-4 border-t border-luxury-gray">
                <div className="flex gap-2">
                  {report.status !== 'resolved' && (
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="text-green-400 hover:text-green-300 hover:bg-green-400/10"
                      onClick={() => updateStatus(report.id, 'resolved')}
                    >
                      Mark Resolved
                    </Button>
                  )}
                  {report.status === 'open' && (
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="text-yellow-400 hover:text-yellow-300 hover:bg-yellow-400/10"
                      onClick={() => updateStatus(report.id, 'in-progress')}
                    >
                      Start Working
                    </Button>
                  )}
                </div>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="text-gray-500 hover:text-red-400"
                  onClick={() => handleDelete(report.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {reports.length === 0 && (
          <div className="col-span-full py-20 text-center">
            <AlertTriangle className="w-12 h-12 text-luxury-gray mx-auto mb-4" />
            <h3 className="text-xl font-serif text-gray-400">No reports found</h3>
            <p className="text-gray-500">Maintenance issues will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
};
