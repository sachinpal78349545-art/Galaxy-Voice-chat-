import React, { useState, useRef } from "react";
import { storage, User } from "../lib/storage";

interface Props { user: User; onLogout: () => void; onUpdate: (u: User) => void; }

const INTERESTS = ["🎵 Music","🎮 Gaming","🎨 Art","📚 Books","🌍 Travel","🍕 Food","🏋️ Fitness","💻 Tech","🎭 Comedy","🌿 Nature","📸 Photography","🎬 Movies"];
const AVATARS = ["🌟","🎵","🌙","🦉","🌌","💫","🔥","🎤","🚀","⭐","💻","⚡","🌈","🎭","🏆","👑","🦁","🐉","🦊","🎯"];

export default function ProfilePage({ user: initialUser, onLogout, onUpdate }: Props) {
  const [user, setUser] = useState<User>(initialUser);
  const [editing, setEditing] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [form, setForm] = useState({ ...initialUser });

  const age = form.birthday ? (() => {
    const b = new Date(form.birthday);
    const n = new Date();
    return Math.floor((n.getTime() - b.getTime()) / (365.25 * 24 * 3600000));
  })() : null;

  const saveEdits = () => {
    const updated = storage.updateUser(user.id, form);
    setUser(updated);
    onUpdate(updated);
    setEditing(false);
  };

  const toggleInterest = (item: string) => {
    const list = form.interests.includes(item)
      ? form.interests.filter(i => i !== item)
      : [...form.interests, item];
    setForm({ ...form, interests: list });
  };

  const pickAvatar = (a: string) => {
    setForm({ ...form, avatar: a });
    setShowAvatarPicker(false);
    if (!editing) {
      const updated = storage.updateUser(user.id, { avatar: a });
      setUser(updated);
      onUpdate(updated);
    }
  };

  const xpPct = Math.min(100, (user.xp / user.xpTarget) * 100);

  return (
    <div className="page-scroll">
      {/* Header */}
      <div style={{
        padding: "52px 16px 0",
        background: "linear-gradient(180deg, rgba(108,92,231,0.12) 0%, transparent 100%)",
      }}>
        {/* Avatar + stats */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingBottom: 20, position: "relative" }}>
          <div style={{ position: "relative" }}>
            <div style={{
              width: 96, height: 96, borderRadius: 48, fontSize: 46,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(108,92,231,0.2)", border: "3px solid rgba(108,92,231,0.5)",
              boxShadow: "0 0 24px rgba(108,92,231,0.4), 0 0 48px rgba(108,92,231,0.15)",
              cursor: "pointer", animation: "float 4s ease-in-out infinite",
            }} onClick={() => setShowAvatarPicker(true)}>
              {user.avatar}
            </div>
            <button
              onClick={() => setShowAvatarPicker(true)}
              style={{
                position: "absolute", bottom: 2, right: 0,
                width: 26, height: 26, borderRadius: 13,
                background: "#6C5CE7", border: "2px solid #0F0F1A",
                cursor: "pointer", fontSize: 12, color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>✏️</button>
          </div>

          <h2 style={{ fontSize: 20, fontWeight: 800, marginTop: 12 }}>{user.nickname || user.username}</h2>
          <p style={{ fontSize: 12, color: "rgba(162,155,254,0.5)", marginBottom: 4 }}>@{user.username}</p>
          <p style={{ fontSize: 11, color: "rgba(162,155,254,0.4)" }}>ID: #{user.id.slice(0, 8).toUpperCase()}</p>

          {/* Level & XP */}
          <div style={{ width: "100%", marginTop: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "rgba(162,155,254,0.5)", marginBottom: 5 }}>
              <span>✨ Level {user.level}</span>
              <span>{user.xp} / {user.xpTarget} XP</span>
            </div>
            <div style={{
              height: 6, borderRadius: 3, background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}>
              <div style={{
                height: "100%", borderRadius: 3, width: `${xpPct}%`,
                background: "linear-gradient(90deg, #6C5CE7, #A29BFE)",
                boxShadow: "0 0 8px rgba(108,92,231,0.4)",
                transition: "width 0.5s ease",
              }} />
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display: "flex", gap: 16, marginTop: 14 }}>
            {[
              { label: "Followers", val: user.followers.length || 537 },
              { label: "Following", val: user.following.length || 413 },
              { label: "💎 Coins",  val: user.coins },
            ].map(s => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <p style={{ fontWeight: 800, fontSize: 18, lineHeight: 1 }}>{s.val.toLocaleString()}</p>
                <p style={{ fontSize: 11, color: "rgba(162,155,254,0.5)", marginTop: 2 }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding: "0 16px 8px", display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Action buttons */}
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setEditing(!editing)}>
            {editing ? "✓ Save Profile" : "✏️ Edit Profile"}
          </button>
          {editing && (
            <button className="btn btn-ghost" onClick={() => { setForm({ ...user }); setEditing(false); }}>
              ✕
            </button>
          )}
        </div>

        {/* User Info Card */}
        <div className="card card-glow">
          <h3 style={{ fontSize: 13, fontWeight: 700, color: "rgba(162,155,254,0.6)", marginBottom: 14, textTransform: "uppercase", letterSpacing: 0.5 }}>
            User Info
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {editing ? (
              <>
                <Field label="Nickname">
                  <input className="input-field" value={form.nickname} onChange={e => setForm({ ...form, nickname: e.target.value })} />
                </Field>
                <Field label="Gender">
                  <select className="input-field" value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}>
                    {["Male","Female","Non-binary","Prefer not to say"].map(g => <option key={g}>{g}</option>)}
                  </select>
                </Field>
                <Field label="Birthday">
                  <input className="input-field" type="date" value={form.birthday} onChange={e => setForm({ ...form, birthday: e.target.value })} />
                </Field>
                <Field label="Location">
                  <input className="input-field" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
                </Field>
                <Field label="Relationship">
                  <select className="input-field" value={form.relationship} onChange={e => setForm({ ...form, relationship: e.target.value })}>
                    {["Single","In a relationship","Married","It's complicated","Rather not say"].map(r => <option key={r}>{r}</option>)}
                  </select>
                </Field>
              </>
            ) : (
              <>
                <InfoRow icon="👤" label="Nickname" val={user.nickname || user.username} />
                <InfoRow icon="⚧" label="Gender" val={user.gender} />
                <InfoRow icon="🎂" label="Age" val={age !== null ? `${age} years old` : "—"} />
                <InfoRow icon="📍" label="Location" val={user.location} />
                <InfoRow icon="💝" label="Relationship" val={user.relationship} />
              </>
            )}
          </div>
        </div>

        {/* About */}
        <div className="card card-glow">
          <h3 style={{ fontSize: 13, fontWeight: 700, color: "rgba(162,155,254,0.6)", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>
            About Me
          </h3>
          {editing ? (
            <textarea className="input-field" rows={3} value={form.bio}
              onChange={e => setForm({ ...form, bio: e.target.value })}
              style={{ resize: "none", lineHeight: 1.5 }} />
          ) : (
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.75)", lineHeight: 1.6 }}>
              {user.bio || "No bio yet. Edit your profile to add one! ✨"}
            </p>
          )}
        </div>

        {/* Interests */}
        <div className="card card-glow">
          <h3 style={{ fontSize: 13, fontWeight: 700, color: "rgba(162,155,254,0.6)", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>
            Interests
          </h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {INTERESTS.map(item => {
              const active = form.interests.includes(item);
              return (
                <button key={item} onClick={() => editing && toggleInterest(item)} style={{
                  padding: "6px 12px", borderRadius: 20, border: "none", cursor: editing ? "pointer" : "default",
                  background: active ? "rgba(108,92,231,0.25)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${active ? "rgba(108,92,231,0.5)" : "rgba(255,255,255,0.08)"}`,
                  color: active ? "#A29BFE" : "rgba(162,155,254,0.5)",
                  fontSize: 12, fontFamily: "inherit", fontWeight: 600,
                  transition: "all 0.2s",
                }}>{item}</button>
              );
            })}
          </div>
        </div>

        {/* Settings */}
        <div className="card card-glow">
          <h3 style={{ fontSize: 13, fontWeight: 700, color: "rgba(162,155,254,0.6)", marginBottom: 14, textTransform: "uppercase", letterSpacing: 0.5 }}>
            Settings
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <SettingsRow icon="🔒" label="Privacy Settings" />
            <SettingsRow icon="🔔" label="Notifications" />
            <SettingsRow icon="🌐" label="Language" />
            <SettingsRow icon="❓" label="Help & Support" />
            <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "6px 0" }} />
            <button
              className="btn btn-danger btn-full"
              style={{ marginTop: 4 }}
              onClick={onLogout}
            >🚪 Log Out</button>
          </div>
        </div>
      </div>

      {/* Avatar picker modal */}
      {showAvatarPicker && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(5,1,18,0.82)",
          display: "flex", alignItems: "flex-end", justifyContent: "center",
          zIndex: 200, backdropFilter: "blur(8px)",
        }} onClick={() => setShowAvatarPicker(false)}>
          <div className="card" style={{
            width: "100%", maxWidth: 400, borderRadius: "24px 24px 0 0",
            padding: 24, animation: "slide-up 0.3s ease",
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 18 }}>Pick Your Avatar 🎭</h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
              {AVATARS.map(a => (
                <button key={a} onClick={() => pickAvatar(a)} style={{
                  width: 52, height: 52, borderRadius: 14, fontSize: 28, border: "2px solid",
                  borderColor: form.avatar === a ? "#6C5CE7" : "rgba(255,255,255,0.1)",
                  background: form.avatar === a ? "rgba(108,92,231,0.2)" : "rgba(255,255,255,0.04)",
                  cursor: "pointer", transition: "all 0.2s",
                  boxShadow: form.avatar === a ? "0 0 12px rgba(108,92,231,0.4)" : "none",
                }}>{a}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Save button for edit mode */}
      {editing && (
        <div style={{ padding: "0 16px 16px" }}>
          <button className="btn btn-primary btn-full" style={{ padding: "14px 0", fontSize: 15 }} onClick={saveEdits}>
            ✓ Save Changes
          </button>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ fontSize: 11, color: "rgba(162,155,254,0.5)", marginBottom: 5, fontWeight: 600 }}>{label}</p>
      {children}
    </div>
  );
}

function InfoRow({ icon, label, val }: { icon: string; label: string; val: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 16, width: 22, textAlign: "center" }}>{icon}</span>
      <div style={{ flex: 1, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 13, color: "rgba(162,155,254,0.5)" }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 600 }}>{val}</span>
      </div>
    </div>
  );
}

function SettingsRow({ icon, label }: { icon: string; label: string }) {
  return (
    <button style={{
      display: "flex", alignItems: "center", gap: 10, padding: "12px 8px",
      background: "none", border: "none", cursor: "pointer", width: "100%",
      borderRadius: 10, transition: "background 0.15s", fontFamily: "inherit",
    }}>
      <span style={{ fontSize: 16 }}>{icon}</span>
      <span style={{ flex: 1, fontSize: 14, color: "rgba(255,255,255,0.75)", textAlign: "left" }}>{label}</span>
      <span style={{ fontSize: 14, color: "rgba(162,155,254,0.3)" }}>›</span>
    </button>
  );
}
