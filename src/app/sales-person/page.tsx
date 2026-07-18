"use client";

import { useState, useEffect } from "react";
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
import { Search, Plus, Edit2, Trash2, Phone, Mail, User } from "lucide-react";
import { getApiUrl } from "@/lib/api";
import AdminLayout from "@/components/AdminLayout";

export default function SalesPersonPage() {
  const [branchCountInput, setBranchCountInput] = useState<string>("1");
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const [salesPersons, setSalesPersons] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: "", name: "" });

  // Only use the new formData state below
  const [formData, setFormData] = useState<{
    firstName: string;
    lastName: string;
    branches: string[];
    branchCount: number;
    phone: string;
    status: string;
    email: string;
    pin: string;
    role: string;
    employmentId: string;
  }>({
    firstName: "",
    lastName: "",
    branches: [],
    branchCount: 1,
    phone: "",
    status: "active",
    email: "",
    pin: "",
    role: "sales_person",
    employmentId: ""
  });

  const [editingPerson, setEditingPerson] = useState<any>(null);

  useEffect(() => {
    const role = typeof window !== "undefined" ? localStorage.getItem("userRole") || "user" : "user";
    if (role.toLowerCase() !== "admin") {
      window.location.href = "/billing";
      return;
    }

    const loadData = async () => {
      await Promise.all([
        fetchBranches(),
        fetchSalesPersons()
      ]);
      setIsInitialLoading(false);
    };
    loadData();
  }, []);

  const fetchBranches = async () => {
    try {
      const res = await fetch(`${getApiUrl()}/api/branches`, {
        method: "GET",
        credentials: "include",
      });
      const data = await res.json();
      if (data?.branches) setBranches(data.branches);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch branches",
      });
    }
  };

  const fetchSalesPersons = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${getApiUrl()}/api/salespersons/`, {
        method: "GET",
        credentials: "include",
      });
      const data = await res.json();
      if (data?.salesPersons) setSalesPersons(data.salesPersons);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch salespersons",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddOrUpdate = async (e: any) => {
    e.preventDefault();
    // Validate PIN: must be exactly 6 digits when creating a new salesperson
    if (!editingPerson) {
      if (!/^[0-9]{6}$/.test(formData.pin)) {
        toast({
          variant: "destructive",
          title: "Invalid PIN",
          description: "PIN must be exactly 6 digits.",
        });
        return;
      }
    }
    setLoading(true);
    try {
      if (editingPerson) {
        const personId = editingPerson._id || editingPerson.id || "";
        const toSendBranches = (formData.branches || []).slice(0, formData.branchCount || 1).filter((id) => typeof id === 'string' && id && branches.some(b => b._id === id));
        const payload: any = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          branches: toSendBranches,
          status: formData.status,
        };

        const res = await fetch(`${getApiUrl()}/api/salespersons/${personId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (res.ok) {
          toast({
            title: "Success",
            description: "Salesperson updated successfully!",
          });
          await fetchSalesPersons();
          handleCloseModal();
        } else {
          toast({
            variant: "destructive",
            title: "Error",
            description: data.message || "Failed to update salesperson.",
          });
        }
      } else {
        const password = formData.pin;
        const status = formData.status;
        function branchesListHasId(branchesArr: any[], id: string): boolean {
          return branchesArr && branchesArr.some((b: any) => b && b._id === id);
        }
        const validBranchIds = (formData.branches || []).slice(0, formData.branchCount || 1).filter(
          (id) => typeof id === "string" && id.length > 0 && branchesListHasId(branches, id)
        );
        const allBranchIdsValid = validBranchIds.length > 0 && validBranchIds.length === (formData.branches || []).slice(0, formData.branchCount || 1).length;
        if (!allBranchIdsValid) {
          toast({
            variant: "destructive",
            title: "Invalid Branch Selection",
            description: "Please select a valid branch for each dropdown.",
          });
          setLoading(false);
          return;
        }
        
        const payload = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          pin: formData.pin,
          branches: validBranchIds,
          employmentId: formData.employmentId,
          password,
          status,
          role: formData.role,
        };
        
        console.log('Sending registration payload:', payload);
        console.log('Validation check:', {
          hasFirstName: !!payload.firstName,
          hasPhone: !!payload.phone && payload.phone.length === 10,
          hasPin: !!payload.pin && payload.pin.length === 6,
          hasEmail: !!payload.email,
          hasEmploymentId: !!payload.employmentId,
          hasRole: payload.role === 'sales_person',
          hasBranches: Array.isArray(payload.branches) && payload.branches.length > 0
        });
        
        const res = await fetch(`${getApiUrl()}/api/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        console.log('Register response:', { status: res.status, data });
        if (res.ok) {
          toast({
            title: "Success",
            description: `Salesperson added successfully! Credentials sent to ${formData.email}`,
          });
          await fetchSalesPersons();
          handleCloseModal();
        } else {
          console.error('Registration failed:', data);
          toast({
            variant: "destructive",
            title: "Error",
            description: data.message || "Failed to add salesperson.",
          });
        }
      }
    } catch (err) {
      console.error("Error adding/updating:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An error occurred. Please check your connection and try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    // Validate MongoDB ObjectId (24 hex chars)
    const id = deleteDialog.id;
    const isValidObjectId = typeof id === "string" && /^[a-fA-F0-9]{24}$/.test(id);
    if (!isValidObjectId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Invalid or missing sales person ID. Cannot delete.",
      });
      setDeleteDialog({ open: false, id: "", name: "" });
      return;
    }
    try {
      const res = await fetch(`${getApiUrl()}/api/salespersons/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        toast({
          title: "Success",
          description: "Salesperson deleted successfully!",
        });
        fetchSalesPersons();
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: data.message || "Failed to delete salesperson.",
        });
      }
    } catch (err) {
      console.error("Error deleting salesperson:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An error occurred while deleting.",
      });
    } finally {
      setDeleteDialog({ open: false, id: "", name: "" });
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingPerson(null);
    setFormData({
      firstName: "",
      lastName: "",
      branches: [],
      branchCount: 1,
      phone: "",
      status: "active",
      email: "",
      pin: "",
      role: "sales_person",
      employmentId: ""
    });
    setBranchCountInput("1");
  };

  const handleEditClick = (person: any) => {
    setEditingPerson(person);
    const branchesArr = Array.isArray(person.branches) ? person.branches : (person.branch ? [person.branch] : []);
    // Normalize branches to branch._id where possible
    const normalizedBranches = (branchesArr || []).map((b: any) => {
      if (!b) return "";
      if (typeof b === 'string') {
        // if already an ObjectId-like string, keep it
        if (/^[a-fA-F0-9]{24}$/.test(b)) return b;
        // try to match by name or code
        const found = branches.find((br: any) => {
          if (!br) return false;
          const name = (br.name || br.branchName || "").toString();
          return name === b || name.includes(b) || (b.includes(br.code || '') || b.includes(br.name || ''));
        });
        return found ? found._id : "";
      }
      if (typeof b === 'object') {
        if (b._id) return b._id;
        if (b.id) return b.id;
        const found = branches.find((br: any) => (br.name === b.name) || (br.branchName === b.branchName));
        return found ? found._id : "";
      }
      return "";
    }).filter((x: string) => !!x);
    const branchCount = normalizedBranches.length || 1;
    // Split name into firstName and lastName if possible
    let firstName = "";
    let lastName = "";
    if (person.name) {
      const parts = person.name.split(" ");
      firstName = parts[0] || "";
      lastName = parts.slice(1).join(" ") || "";
    }
    setFormData({
      firstName,
      lastName,
      branches: normalizedBranches,
      branchCount,
      phone: person.contactNo || "",
      status: person.status || "active",
      email: person.email || "",
      pin: "", // Pin is usually not sent back for security, keep empty or handle if needed
      role: "sales_person",
      employmentId: person.employeeId || "",
    });
    setBranchCountInput(branchCount.toString());
    setShowModal(true);
  };

  // Pagination Logic
  const filteredPersons = salesPersons.filter((p) =>
    p.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const totalPages = Math.max(1, Math.ceil(filteredPersons.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentPersons = filteredPersons.slice(startIndex, startIndex + itemsPerPage);

  const SkeletonLoader = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[50px]">#</TableHead>
          <TableHead>Employee ID</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Branch</TableHead>
          <TableHead>Contact</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {[...Array(5)].map((_, i) => (
          <TableRow key={i}>
            <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse w-8" /></TableCell>
            <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse w-20" /></TableCell>
            <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse w-32" /></TableCell>
            <TableCell><div className="h-6 bg-gray-200 rounded animate-pulse w-24" /></TableCell>
            <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse w-24" /></TableCell>
            <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse w-40" /></TableCell>
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
                <h1 className="text-2xl font-bold tracking-tight">Sales Person Management</h1>
                <p className="text-muted-foreground text-sm mt-1">Manage sales staff, assignments, and details.</p>
            </div>
            <Button onClick={() => setShowModal(true)} className="gap-2">
                <Plus className="h-4 w-4" /> Add Sales Person
            </Button>
        </div>

        <Card>
            <CardHeader className="p-4 sm:p-6 border-b">
                <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
                    <div className="relative w-full sm:w-80">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by name..."
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
                            <TableHead>Employee ID</TableHead>
                            <TableHead>Name</TableHead>
                            {/* <TableHead>User</TableHead> */}
                            <TableHead>Branch</TableHead>
                            <TableHead>Contact</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading && salesPersons.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="h-24 text-center">Loading sales persons...</TableCell>
                            </TableRow>
                        ) : currentPersons.length === 0 ? (
                             <TableRow>
                                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                                    No sales persons found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            currentPersons.map((person, index) => (
                                <TableRow key={person._id || person.id || index}>
                                    <TableCell>{startIndex + index + 1}</TableCell>
                                    <TableCell className="font-medium">{person.employeeId}</TableCell>
                                    <TableCell>
                                        <div className="font-medium">{person.name}</div>
                                        <div className="text-xs text-muted-foreground hidden sm:block">{person.user}</div>
                                    </TableCell>
                                    {/* <TableCell>{person.user}</TableCell> */}
                                    <TableCell>
                                      {Array.isArray(person.branches) && person.branches.length > 0
                                        ? person.branches.map((branch: { id: string; name: string }, idx: number) => (
                                            <Badge key={`${person._id || person.id}-${branch.id}-${idx}`} className="mr-1" variant="secondary">
                                              {branch.name}
                                            </Badge>
                                          ))
                                        : <span className="text-muted-foreground">No branches assigned</span>}
                                    </TableCell>
                                    <TableCell>
                                         <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                            <Phone className="h-3 w-3" />
                                            {person.contactNo}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                            <Mail className="h-3 w-3" />
                                            {person.email}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={person.status === 'active' ? 'default' : 'secondary'} 
                                            className={person.status === 'active' ? 'bg-green-100 text-green-700 hover:bg-green-100' : ''}>
                                            {person.status || 'Active'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => handleEditClick(person)}>
                                                <Edit2 className="h-4 w-4 text-blue-500" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              onClick={() => {
                                                // Always use _id if available, fallback to id
                                                const id = person._id || person.id || "";
                                                setDeleteDialog({
                                                  open: true,
                                                  id,
                                                  name: (person.firstName ? person.firstName + " " : "") + (person.lastName || "")
                                                });
                                              }}
                                            >
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
            <DialogContent className="w-full max-w-lg sm:max-w-2xl md:max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{editingPerson ? "Edit Sales Person" : "Add New Sales Person"}</DialogTitle>
                    <DialogDescription>
                        {editingPerson ? "Update the employee details below." : "Enter the details for the new sales person."}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddOrUpdate} className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                                  <div className="grid gap-2">
                                    <Label htmlFor="role">Role</Label>
                                    <Select
                                      value={formData.role}
                                      onValueChange={value => setFormData({ ...formData, role: value })}
                                      required
                                    >
                                      <SelectTrigger id="role">
                                        <SelectValue placeholder="Select role" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="sales_person">Sales Person</SelectItem>
                                        <SelectItem value="admin">Admin</SelectItem>
                                        <SelectItem value="manager">Manager</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                         <div className="grid gap-2">
                            <Label htmlFor="employmentId">Employee ID</Label>
                            <Input
                              id="employmentId"
                              placeholder="e.g. EMP001"
                              value={formData.employmentId}
                              onChange={(e) => setFormData({ ...formData, employmentId: e.target.value })}
                              required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="firstName">First Name</Label>
                            <Input
                              id="firstName"
                              placeholder="First Name"
                              value={formData.firstName}
                              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                              required
                            />
                            <Label htmlFor="lastName">Last Name</Label>
                            <Input
                              id="lastName"
                              placeholder="Last Name"
                              value={formData.lastName}
                              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
/>
                        </div>
                    </div>
                   
                    <div className="grid gap-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="john@example.com"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="phone">Contact Number</Label>
                            <Input
                              id="phone"
                              placeholder="10-digit number"
                              value={formData.phone}
                              onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                                setFormData({ ...formData, phone: value });
                              }}
                              pattern="[0-9]{10}"
                              required
                            />
                        </div>
                         {!editingPerson && (
                          <div className="grid gap-2">
                            <Label htmlFor="pin">PIN (6 digits)</Label>
                            <Input
                                id="pin"
                                placeholder="e.g. 123456"
                                value={formData.pin}
                                onChange={(e) => {
                                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                                    setFormData({ ...formData, pin: value });
                                }}
                                pattern="[0-9]{6}"
                                required
                            />
                          </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="branchCount">How many branches to assign?</Label>
                            <Input
                              id="branchCount"
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              min={1}
                              value={branchCountInput}
                              onChange={e => {
                                let value = e.target.value.replace(/\D/g, "");
                                setBranchCountInput(value);
                              }}
                              onBlur={e => {
                                let value = e.target.value.replace(/\D/g, "");
                                let count = Number(value);
                                if (!count || isNaN(count) || count < 1) count = 1;
                                setBranchCountInput(count.toString());
                                setFormData(form => ({
                                  ...form,
                                  branchCount: count,
                                  branches: (form.branches || []).slice(0, count)
                                }));
                              }}
                              required
                            />
                            <div className="space-y-2 mt-2">
                              {Array.from({ length: Math.max(1, formData.branchCount || 1) }).map((_, idx) => {
                                const selectedBranches = formData.branches.filter((b, i) => i !== idx && b);
                                const availableBranches = branches.filter((b: any) => !selectedBranches.includes(b._id));
                                return (
                                <Select
                                  key={idx}
                                  value={formData.branches[idx] || ""}
                                  onValueChange={value => {
                                    setFormData(form => {
                                      const updated = [...(form.branches || [])];
                                      updated[idx] = value;
                                      return { ...form, branches: updated };
                                    });
                                  }}
                                  required
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder={`Select Branch #${idx + 1}`} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {availableBranches.map((b: any) => (
                                      <SelectItem key={b._id} value={b._id}>{b.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )})}
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="status">Status</Label>
                        <Select
                            value={formData.status}
                            onValueChange={(value) => setFormData({ ...formData, status: value })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select Status" />
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
                            {loading ? "Saving..." : editingPerson ? "Update Person" : "Add Person"}
                         </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>

        <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, id: "", name: "" })}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the salesperson
                <span className="font-semibold text-gray-900"> {deleteDialog.name}</span>.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                Delete Person
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        
      </div>
    </AdminLayout>
  );
}