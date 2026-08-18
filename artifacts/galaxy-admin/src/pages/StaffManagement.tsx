// src/pages/StaffManagement.tsx
import { useState, useEffect } from "react";
import { ref, onValue, set, remove } from "firebase/database";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";

interface Staff {
  uid: string;
  name: string;
  email: string;
  role: string;
  createdAt: number;
  lastLoginAt?: number;
  lastLoginIP?: string;
  status: "active" | "inactive";
}

export default function StaffManagement() {
  const { toast } = useToast();
  const [staffs, setStaffs] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newStaff, setNewStaff] = useState({ name: "", email: "", role: "User Manager", password: "" });

  useEffect(() => {
    const refStaff = ref(db, "staff");
    const unsub = onValue(refStaff, snap => {
      if (snap.exists()) {
        const data = snap.val();
        const list = Object.keys(data).map(key => ({ ...data[key], uid: key }));
        list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setStaffs(list);
      } else setStaffs([]);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleCreate = async () => {
    if (!newStaff.name || !newStaff.email || !newStaff.password) { toast({ title: "All fields required", variant: "destructive" }); return; }
    try {
      await set(ref(db, `staff/${Date.now()}`), { ...newStaff, createdAt: Date.now(), status: "active", lastLoginAt: null });
      toast({ title: "Staff created ✅" });
      setNewStaff({ name: "", email: "", role: "User Manager", password: "" });
      setCreating(false);
    } catch { toast({ title: "Create failed", variant: "destructive" }); }
  };

  const handleDelete = async (uid: string) => {
    if (!confirm("Delete this staff?")) return;
    await remove(ref(db, `staff/${uid}`));
    toast({ title: "Deleted" });
  };

  if (loading) return <div className="text-white p-6">Loading...</div>;

  const active = staffs.filter(s => s.status === "active").length;
  const inactive = staffs.filter(s => s.status === "inactive").length;

  return (
    <div className="space-y-6 p-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-white">Staff Management</h1><p className="text-muted-foreground">Manage staff users and role-based accounts</p></div>
        <Button onClick={() => setCreating(!creating)}><Plus className="w-4 h-4 mr-2" />Create Staff</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total Staff</p><p className="text-2xl font-bold text-white">{staffs.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Active Staff</p><p className="text-2xl font-bold text-green-400">{active}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Inactive Staff</p><p className="text-2xl font-bold text-red-400">{inactive}</p></CardContent></Card>
      </div>

      {creating && (
        <Card className="bg-card border-border p-4 space-y-2">
          <Input placeholder="Full Name" value={newStaff.name} onChange={e => setNewStaff({...newStaff, name: e.target.value})} />
          <Input placeholder="Email" value={newStaff.email} onChange={e => setNewStaff({...newStaff, email: e.target.value})} />
          <Input placeholder="Role" value={newStaff.role} onChange={e => setNewStaff({...newStaff, role: e.target.value})} />
          <Input type="password" placeholder="Temporary Password" value={newStaff.password} onChange={e => setNewStaff({...newStaff, password: e.target.value})} />
          <div className="flex gap-2"><Button onClick={handleCreate}>Save</Button><Button variant="outline" onClick={() => setCreating(false)}>Cancel</Button></div>
        </Card>
      )}

      <div className="bg-card border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border text-muted-foreground"><th>Name</th><th>Email</th><th>Role</th><th>Last Login</th><th>IP</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {staffs.map(s => (
              <tr key={s.uid} className="border-b border-border/40">
                <td className="p-3 text-white">{s.name}</td>
                <td className="p-3 text-white">{s.email}</td>
                <td className="p-3 text-white">{s.role}</td>
                <td className="p-3 text-white">{s.lastLoginAt ? new Date(s.lastLoginAt).toLocaleString() : "—"}</td>
                <td className="p-3 text-white">{s.lastLoginIP || "—"}</td>
                <td><span className={`px-2 py-1 rounded-full text-xs ${s.status === "active" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>{s.status}</span></td>
                <td><Button size="sm" variant="ghost" onClick={() => handleDelete(s.uid)}><Trash2 className="w-4 h-4 text-red-400" /></Button></td>
              </tr>
            ))}
            {staffs.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No staff found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}