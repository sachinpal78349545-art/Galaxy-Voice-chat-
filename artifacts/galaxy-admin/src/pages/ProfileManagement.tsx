// src/pages/ProfileManagement.tsx
import { useState, useEffect } from "react";
import { ref, get, update } from "firebase/database";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

export default function ProfileManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState({ name: "", email: "" });
  const [passwords, setPasswords] = useState({ current: "", new: "", confirm: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const snap = await get(ref(db, `users/${user.uid}`));
      if (snap.exists()) setProfile({ name: snap.val().name || "", email: snap.val().email || "" });
      setLoading(false);
    };
    fetch();
  }, [user]);

  const handleProfileUpdate = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await update(ref(db, `users/${user.uid}`), { name: profile.name, email: profile.email });
      toast({ title: "Profile updated ✅" });
    } catch { toast({ title: "Failed", variant: "destructive" }); }
    setSaving(false);
  };

  const handlePasswordChange = async () => {
    if (passwords.new !== passwords.confirm) { toast({ title: "New password and confirm do not match", variant: "destructive" }); return; }
    if (passwords.new.length < 6) { toast({ title: "Password must be at least 6 characters", variant: "destructive" }); return; }
    toast({ title: "Password change requested. Implement with Firebase Auth." });
  };

  if (loading) return <div className="text-white p-6">Loading...</div>;

  return (
    <div className="space-y-6 p-6 max-w-4xl">
      <h1 className="text-2xl font-bold text-white">Profile Management</h1>
      <Card className="bg-card border-border">
        <CardContent className="space-y-2">
          <div><Label>Name</Label><Input value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} /></div>
          <div><Label>Email</Label><Input value={profile.email} onChange={e => setProfile({...profile, email: e.target.value})} /></div>
          <Button onClick={handleProfileUpdate} disabled={saving}>Update Profile</Button>
        </CardContent>
      </Card>
      <Card className="bg-card border-border">
        <CardContent className="space-y-2">
          <h3 className="text-white text-lg font-semibold">Change Password</h3>
          <div><Label>Current Password</Label><Input type="password" value={passwords.current} onChange={e => setPasswords({...passwords, current: e.target.value})} /></div>
          <div><Label>New Password</Label><Input type="password" value={passwords.new} onChange={e => setPasswords({...passwords, new: e.target.value})} /></div>
          <div><Label>Confirm New Password</Label><Input type="password" value={passwords.confirm} onChange={e => setPasswords({...passwords, confirm: e.target.value})} /></div>
          <Button onClick={handlePasswordChange}>Update Password</Button>
        </CardContent>
      </Card>
    </div>
  );
}