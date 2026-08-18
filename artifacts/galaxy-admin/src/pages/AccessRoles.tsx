// src/pages/AccessRoles.tsx
import { useState, useEffect } from "react";
import { ref, onValue, set, remove } from "firebase/database";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Edit2, Save } from "lucide-react";

interface ModulePermission {
  module: string;
  all: boolean;
  list: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}

interface Role {
  id: string;
  name: string;
  permissions: ModulePermission[];
  status: "active" | "inactive";
  createdAt: number;
}

const MODULES = [
  { section: "USER MANAGEMENT", modules: ["User", "KYC Verification", "Agency", "Coin Trader"] },
  { section: "HOST MANAGEMENT", modules: ["Host Application", "Host"] },
  { section: "ANNOUNCEMENT", modules: ["Announcement"] },
  { section: "LIVE CONTENT", modules: ["Live Stream", "Audio Room", "PK Battle", "Multi Live", "Call Join", "Live History", "Live Banned User"] },
  { section: "CALL MANAGEMENT", modules: ["Call"] },
  { section: "BANNER", modules: ["Splash Banner", "Home Banner", "Gift Banner", "Game Banner"] },
  { section: "CONTENT", modules: ["Social Media", "Songs", "Hashtag"] },
  { section: "ENGAGEMENT", modules: ["Gifts", "Store", "Reaction", "Beauty Effect"] },
  { section: "GAME", modules: ["Game", "Game History"] },
  { section: "LUCKY GIFT", modules: ["Lucky Gift History"] },
  { section: "PACKAGE", modules: ["Coin Plan", "Order History"] },
  { section: "FINANCIAL", modules: ["Payout Method", "Payout Request", "Currency"] },
];

export default function AccessRoles() {
  const { toast } = useToast();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Role | null>(null);

  useEffect(() => {
    const refRoles = ref(db, "accessRoles");
    const unsub = onValue(refRoles, snap => {
      if (snap.exists()) {
        const data = snap.val();
        const list = Object.keys(data).map(key => ({ ...data[key], id: key }));
        setRoles(list);
      } else setRoles([]);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const initializePermissions = () => {
    const perms: ModulePermission[] = [];
    MODULES.forEach(section => section.modules.forEach(mod => perms.push({ module: mod, all: false, list: false, create: false, edit: false, delete: false })));
    return perms;
  };

  const handleCreate = async () => {
    const name = prompt("Enter role name:");
    if (!name) return;
    const newRole: Role = { id: Date.now().toString(), name, permissions: initializePermissions(), status: "active", createdAt: Date.now() };
    await set(ref(db, `accessRoles/${newRole.id}`), newRole);
    toast({ title: "Role created" });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this role?")) return;
    await remove(ref(db, `accessRoles/${id}`));
    toast({ title: "Deleted" });
  };

  const toggleStatus = async (id: string, current: string) => {
    const status = current === "active" ? "inactive" : "active";
    await set(ref(db, `accessRoles/${id}/status`), status);
    toast({ title: `Status ${status}` });
  };

  const updatePermission = (roleId: string, moduleName: string, key: string, value: boolean) => {
    setRoles(roles.map(r => {
      if (r.id !== roleId) return r;
      const perms = r.permissions.map(p => {
        if (p.module !== moduleName) return p;
        if (key === "all") {
          const newAll = value;
          return { ...p, all: newAll, list: newAll, create: newAll, edit: newAll, delete: newAll };
        }
        return { ...p, [key]: value };
      });
      return { ...r, permissions: perms };
    }));
  };

  const saveRole = async (role: Role) => {
    await set(ref(db, `accessRoles/${role.id}`), role);
    toast({ title: "Role updated" });
    setEditing(null);
  };

  if (loading) return <div className="text-white p-6">Loading...</div>;

  return (
    <div className="space-y-6 p-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-white">Access Roles</h1><p className="text-muted-foreground text-sm">Manage staff roles and permission access</p></div>
        <Button onClick={handleCreate}><Plus className="w-4 h-4 mr-2" />Create Role</Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total Roles</p><p className="text-2xl font-bold text-white">{roles.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Active</p><p className="text-2xl font-bold text-green-400">{roles.filter(r => r.status === "active").length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Inactive</p><p className="text-2xl font-bold text-red-400">{roles.filter(r => r.status === "inactive").length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Subadmins</p><p className="text-2xl font-bold text-white">3</p></CardContent></Card>
      </div>

      <div className="space-y-4">
        {roles.map(role => (
          <Card key={role.id} className="bg-card border-border p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-white font-semibold text-lg">{role.name}</span>
                <Badge className={role.status === "active" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}>{role.status}</Badge>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => setEditing(role)}><Edit2 className="w-4 h-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => toggleStatus(role.id, role.status)}>{role.status === "active" ? "Deactivate" : "Activate"}</Button>
                <Button size="sm" variant="ghost" className="text-red-400" onClick={() => handleDelete(role.id)}><Trash2 className="w-4 h-4" /></Button>
              </div>
            </div>

            {editing?.id === role.id && (
              <div className="mt-4 space-y-2">
                <Input value={role.name} onChange={e => setRoles(roles.map(r => r.id === role.id ? { ...r, name: e.target.value } : r))} className="max-w-xs bg-background border-border" />
                {role.permissions.slice(0, 20).map(p => (
                  <div key={p.module} className="flex items-center gap-4 text-sm">
                    <span className="w-32 text-white">{p.module}</span>
                    <Switch checked={p.all} onCheckedChange={v => updatePermission(role.id, p.module, "all", v)} size="sm" />
                    <Switch checked={p.list} onCheckedChange={v => updatePermission(role.id, p.module, "list", v)} size="sm" />
                    <Switch checked={p.create} onCheckedChange={v => updatePermission(role.id, p.module, "create", v)} size="sm" />
                    <Switch checked={p.edit} onCheckedChange={v => updatePermission(role.id, p.module, "edit", v)} size="sm" />
                    <Switch checked={p.delete} onCheckedChange={v => updatePermission(role.id, p.module, "delete", v)} size="sm" />
                  </div>
                ))}
                <Button onClick={() => saveRole(role)}><Save className="w-4 h-4 mr-2" />Save</Button>
                <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              </div>
            )}
          </Card>
        ))}
        {roles.length === 0 && <div className="text-center text-muted-foreground py-8">No roles</div>}
      </div>
    </div>
  );
}