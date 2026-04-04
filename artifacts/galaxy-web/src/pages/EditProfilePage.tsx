import React, { useState, useRef } from "react";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage as fbStorage } from "../lib/firebase";
import { UserProfile, updateUser, AVATAR_LIST } from "../lib/userService";

interface Props { user: UserProfile; onUpdate: (u: UserProfile) => void; onBack: () => void; }

export default function EditProfilePage({ user, onUpdate, onBack }: Props) {
  const [form, setForm] = useState({
    name:     user.name,
    bio:      user.bio,
    gender:   user.gender,
    birthday: user.birthday,
    avatar:   user.avatar,
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const path = `avatars/${user.uid}`;
      const sRef = storageRef(fbStorage, path);
      await uploadBytes(sRef, file);
      const url = await getDownloadURL(sRef);
      setForm(f => ({ ...f, avatar: url }));
    } catch (err) {
      console.error("Upload failed:", err);
      // Fallback: use file reader for local preview
      const reader = new FileReader();
      reader.onload = ev => setForm(f => ({ ...f, avatar: ev.target?.result as string }));
      reader.readAsDataURL(file);
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    const updated: UserProfile = { ...user, ...form };
    await updateUser(user.uid, { name: form.name, bio: form.bio, gender: form.gender, birthday: form.birthday, avatar: form.avatar });
    onUpdate(updated);
    setSaving(false);
    onBack();
  };

  const isUrl = form.avatar.startsWith("http") || form.avatar.startsWith("data:");

  return (
    <div className="page-scroll">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "54px 16px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <button onClick={onBack} style={{
          width: 38, height: 38, borderRadius: 12, background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.09)", cursor: "pointer", fontSize: 18, color: "#fff",
        }}>‹</button>
        <h1 style={{ fontSize: 18, fontWeight: 900, flex: 1 }}>Edit Profile ✏️</h1>
        <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

      <div style={{ padding: "24px 16px", display: "flex", flexDirection: "column", gap: 22 }}>
        {/* Avatar */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div style={{ position: "relative" }}>
            <div style={{
              width: 96, height: 96, borderRadius: 48, overflow: "hidden",
              background: "rgba(108,92,231,0.2)", border: "3px solid rgba(108,92,231,0.5)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 24px rgba(108,92,231,0.4)",
            }}>
              {isUrl ? (
                <img src={form.avatar} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ fontSize: 48 }}>{form.avatar}</span>
              )}
            </div>
            {uploading && (
              <div style={{
                position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", borderRadius: 48,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <div style={{ width: 24, height: 24, borderRadius: 12, border: "2.5px solid rgba(162,155,254,0.3)", borderTopColor: "#A29BFE", animation: "spin 0.7s linear infinite" }} />
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
              📷 Upload Photo
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowPicker(true)}>
              🎭 Pick Emoji
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageUpload} />
        </div>

        {/* Name */}
        <div>
          <label style={{ fontSize: 12, color: "rgba(162,155,254,0.55)", fontWeight: 700, marginBottom: 7, display: "block" }}>Username</label>
          <input className="input-field" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Your name" />
        </div>

        {/* UID (read-only) */}
        <div>
          <label style={{ fontSize: 12, color: "rgba(162,155,254,0.55)", fontWeight: 700, marginBottom: 7, display: "block" }}>UID (auto-generated)</label>
          <input className="input-field" value={user.uid.toUpperCase()} readOnly style={{ opacity: 0.5, cursor: "not-allowed" }} />
        </div>

        {/* Bio */}
        <div>
          <label style={{ fontSize: 12, color: "rgba(162,155,254,0.55)", fontWeight: 700, marginBottom: 7, display: "block" }}>About Me</label>
          <textarea className="input-field" rows={3} value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} placeholder="Tell the galaxy about yourself..." />
        </div>

        {/* Gender */}
        <div>
          <label style={{ fontSize: 12, color: "rgba(162,155,254,0.55)", fontWeight: 700, marginBottom: 7, display: "block" }}>Gender</label>
          <select className="input-field" value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
            {["Male","Female","Non-binary","Other","Prefer not to say"].map(g => <option key={g}>{g}</option>)}
          </select>
        </div>

        {/* Birthday */}
        <div>
          <label style={{ fontSize: 12, color: "rgba(162,155,254,0.55)", fontWeight: 700, marginBottom: 7, display: "block" }}>Birthday</label>
          <input className="input-field" type="date" value={form.birthday} onChange={e => setForm(f => ({ ...f, birthday: e.target.value }))} />
        </div>

        <button className="btn btn-primary btn-full" style={{ padding: "15px 0", fontSize: 15 }} onClick={save} disabled={saving}>
          {saving ? "Saving..." : "✓ Save Changes"}
        </button>
      </div>

      {/* Emoji avatar picker */}
      {showPicker && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(5,1,18,0.88)", backdropFilter: "blur(10px)",
          display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 400,
        }} onClick={() => setShowPicker(false)}>
          <div className="card" style={{
            width: "100%", maxWidth: 400, borderRadius: "24px 24px 0 0",
            padding: 24, animation: "slide-up 0.3s ease",
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 17, fontWeight: 900, marginBottom: 18 }}>Pick Avatar 🎭</h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
              {AVATAR_LIST.map(a => (
                <button key={a} onClick={() => { setForm(f => ({ ...f, avatar: a })); setShowPicker(false); }} style={{
                  width: 54, height: 54, borderRadius: 16, fontSize: 30, border: "2px solid",
                  borderColor: form.avatar === a ? "#6C5CE7" : "rgba(255,255,255,0.09)",
                  background: form.avatar === a ? "rgba(108,92,231,0.22)" : "rgba(255,255,255,0.04)",
                  cursor: "pointer", transition: "all 0.2s",
                  boxShadow: form.avatar === a ? "0 0 14px rgba(108,92,231,0.45)" : "none",
                }}>{a}</button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
