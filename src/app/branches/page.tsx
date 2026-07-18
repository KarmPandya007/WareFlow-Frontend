"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Plus, Edit2, Trash2, MapPin, Phone } from "lucide-react";
import { getApiUrl } from "@/lib/api";
import AdminLayout from "@/components/AdminLayout";

export default function BranchesPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const [branches, setBranches] = useState<any[]>([]);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: "", name: "" });
  const [loading, setLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    location: "",
    contact: "",
    status: "active"
  });
  const [editingBranch, setEditingBranch] = useState<any>(null);

  useEffect(() => {
    const role = typeof window !== 'undefined' ? localStorage.getItem('userRole') || 'user' : 'user';
    if (role.toLowerCase() !== 'admin') {
      window.location.href = '/billing';
      return;
    }

    const loadData = async () => {
      await fetchBranches();
      setIsInitialLoading(false);
    };
    loadData();
  }, []);

  const fetchBranches = async () => {
    setLoading(true);
    try {
      console.log("Fetching branches from backend...");
      const response = await fetch(`${getApiUrl()}/api/branches`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Fetched branches:", data);
      
      if (data.success && Array.isArray(data.branches)) {
        setBranches(data.branches);
      } else {
        setBranches([]);
      }
    } catch (error) {
      console.error("Error fetching branches:", error);
      // Fallback to localStorage for development if needed, but logging error strictly first
       toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch branches.",
      });
    } finally {
        setLoading(false);
    }
  };

  const handleAddOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
        if (editingBranch) {
            // Update existing branch
            const response = await fetch(`${getApiUrl()}/api/branches/${editingBranch._id}`, {
                method: 'PUT',
                headers: {
                'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(formData)
            });
            
            const data = await response.json();
            if (data.success) {
                console.log('Branch updated successfully');
                toast({ title: "Success", description: "Branch updated successfully!" });
                setEditingBranch(null);
                handleCloseModal();
                fetchBranches();
            } else {
                toast({ title: "Failed to update", description: data.message, variant: "destructive" });
            }
        } else {
            // Create new branch
            const response = await fetch(`${getApiUrl()}/api/branches`, {
                method: 'POST',
                headers: {
                'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(formData)
            });
            
            const data = await response.json();
            if (data.success) {
                console.log('Branch created successfully');
                toast({ title: "Success", description: `${formData.name} has been added.` });
                handleCloseModal();
                fetchBranches();
            } else {
                toast({ title: "Failed to create", description: data.message, variant: "destructive" });
            }
        }
    } catch (error) {
        console.error('Error submitting branch:', error);
        toast({ title: "Save failed", description: "An error occurred. Please try again.", variant: "destructive" });
    } finally {
        setLoading(false);
    }
  };

  const handleDelete = async () => {
      if (!deleteDialog.id) return;
      
      try {
          const response = await fetch(`${getApiUrl()}/api/branches/${deleteDialog.id}`, {
            method: 'DELETE',
            credentials: 'include'
          });
          const data = await response.json();
          if (data.success) {
            toast({ title: "Success", description: "Branch deleted successfully." });
            fetchBranches();
          } else {
            toast({ title: "Delete failed", description: data.message, variant: "destructive" });
          }
      } catch (error) {
          console.error('Error deleting branch:', error);
          toast({ title: "Delete failed", description: "Please try again.", variant: "destructive" });
      } finally {
          setDeleteDialog({ open: false, id: "", name: "" });
      }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingBranch(null);
    setFormData({ name: "", code: "", location: "", contact: "", status: "active" });
  };

  const handleEditClick = (branch: any) => {
      setEditingBranch(branch);
      setFormData({
        name: branch.name,
        code: branch.code || '',
        location: branch.location || '',
        contact: branch.contact || '',
        status: branch.status
      });
      setShowModal(true);
  };

  // Pagination Logic
  const filteredBranches = branches.filter((b) =>
    b.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const totalPages = Math.max(1, Math.ceil(filteredBranches.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentBranches = filteredBranches.slice(startIndex, startIndex + itemsPerPage);

  const SkeletonLoader = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[50px]">#</TableHead>
          <TableHead>Branch Name</TableHead>
          <TableHead>Branch Code</TableHead>
          <TableHead>Location</TableHead>
          <TableHead>Contact</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {[...Array(5)].map((_, i) => (
          <TableRow key={i}>
            <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse w-8" /></TableCell>
            <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse w-32" /></TableCell>
            <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse w-20" /></TableCell>
            <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse w-40" /></TableCell>
            <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse w-24" /></TableCell>
            <TableCell><div className="h-6 bg-gray-200 rounded animate-pulse w-16" /></TableCell>
            <TableCell><div className="h-8 bg-gray-200 rounded animate-pulse w-20 ml-auto" /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Branches Management</h1>
                <p className="text-muted-foreground text-sm mt-1">Manage your store locations and contact details.</p>
            </div>
            <Button onClick={() => setShowModal(true)} className="gap-2">
                <Plus className="h-4 w-4" /> Add Branch
            </Button>
        </div>
        
        <Card>
            <CardHeader className="p-4 sm:p-6 border-b">
                <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
                    <div className="relative w-full sm:w-80">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search branches..."
                            className="pl-9"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {isInitialLoading ? (
                  <SkeletonLoader />
                ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[50px]">#</TableHead>
                            <TableHead>Branch Name</TableHead>
                            <TableHead>Branch Code</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead>Contact</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading && branches.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center">Loading branches...</TableCell>
                            </TableRow>
                        ) : currentBranches.length === 0 ? (
                             <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                    No branches found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            currentBranches.map((branch, index) => (
                                <TableRow key={branch._id || index}>
                                    <TableCell>{startIndex + index + 1}</TableCell>
                                    <TableCell className="font-medium">{branch.name}</TableCell>
                                    <TableCell className="text-muted-foreground">{branch.code || 'N/A'}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                            <MapPin className="h-3 w-3" />
                                            {branch.location || '-'}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                         <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                            <Phone className="h-3 w-3" />
                                            {branch.contact || '-'}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={branch.status === 'active' ? 'default' : 'secondary'} 
                                            className={branch.status === 'active' ? 'bg-green-100 text-green-700 hover:bg-green-100' : ''}>
                                            {branch.status === 'active' ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => handleEditClick(branch)}>
                                                <Edit2 className="h-4 w-4 text-blue-500" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => setDeleteDialog({ open: true, id: branch._id, name: branch.name })}>
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
                )}
            </CardContent>

             {/* Pagination */}
             {totalPages > 1 && (
                <div className="flex items-center justify-end space-x-2 p-4 border-t">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                    >
                        Previous
                    </Button>
                    <div className="text-sm font-medium">Page {currentPage} of {totalPages}</div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                    >
                        Next
                    </Button>
                </div>
            )}
        </Card>

        {/* Add/Edit Modal */}
        <Dialog open={showModal} onOpenChange={(open) => {
            if (!open) handleCloseModal();
            else setShowModal(true);
        }}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{editingBranch ? "Edit Branch" : "Add New Branch"}</DialogTitle>
                    <DialogDescription>
                        {editingBranch ? "Update the branch details below." : "Enter the details for the new branch location."}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddOrUpdate} className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Branch Name</Label>
                        <Input
                            id="name"
                            placeholder="e.g. Main Street Store"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="code">Branch Code (Optional)</Label>
                        <Input
                            id="code"
                            placeholder="e.g. BR-001"
                            value={formData.code}
                            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        />
                    </div>
                    <div className="grid gap-2">
                         <Label htmlFor="location">Location</Label>
                        <Input
                            id="location"
                            placeholder="e.g. New York, NY"
                            value={formData.location}
                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        />
                    </div>
                    <div className="grid gap-2">
                         <Label htmlFor="contact">Contact Number</Label>
                        <Input
                            id="contact"
                            placeholder="10-digit number"
                            value={formData.contact}
                            onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                                setFormData({ ...formData, contact: value });
                            }}
                            pattern="[0-9]{10}"
                            title="Please enter a 10-digit phone number"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="status">Status</Label>
                        <Select
                            value={formData.status}
                            onValueChange={(value) => setFormData({ ...formData, status: value })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="inactive">Inactive</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex justify-end gap-3 mt-4">
                         <Button type="button" variant="outline" onClick={handleCloseModal}>Cancel</Button>
                         <Button type="submit" disabled={loading}>
                            {loading ? "Saving..." : editingBranch ? "Update Branch" : "Add Branch"}
                         </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>

        {/* Delete Confirmation Alert */}
        <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, id: "", name: "" })}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the branch 
                <span className="font-semibold text-gray-900"> {deleteDialog.name}</span>.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                Delete Branch
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </div>
    </AdminLayout>
  );
}