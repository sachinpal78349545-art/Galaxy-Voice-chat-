import React, { useState, useRef } from "react";
import { uploadToCloudinary } from "../lib/cloudinary";
import { UserProfile, updateUser, AVATAR_LIST } from "../lib/userService";
import { useToast } from "../lib/toastContext";
import imageCompression from "browser-image-compression";
import { Compass, Moon, Zap, Calendar, Shield, Copy, Check, Sparkles } from "lucide-react"; // Installed Lucide-react components

interface Props { user: UserProfile; onUpdate: (u: UserProfile) => void; onBack: () => void; }

export default function EditProfilePage({ user, onUpdate, onBack }: Props) {
  const [form, setForm] = useState({
    name: user.name,
    bio: user.bio,
    gender: user.gender || "Cosmic Male",
    birthday: user.birthday,
    avatar: user.avatar,
    cosmicElement: "Dark Matter", // Added unique galaxy drop state
  });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStep, setUploadStep] = useState("");
  const [saving, setSaving] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);
  
  const { showToast } = useToast();

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Callsign is required";
    if (form.name.length > 30) errs.name = "Max 30 characters";
    if (form.bio.length > 200) errs.bio = "Max 200 characters";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCopyId = () => {
    // Formatting display id string
    const formattedId = `GXY_${user.uid.slice(0, 9).toUpperCase()}`;
    navigator.clipboard.writeText(formattedId);
    setCopied(true);
    showToast("Star-ID Copied!", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadProgress(10);
    setUploadStep("Compressing...");

    try {
      let compressed: Blob = file;
      try {
        compressed = await imageCompression(file, {
          maxSizeMB: 0.1,
          maxWidthOrHeight: 800,
          useWebWorker: true,
          fileType: "image/jpeg",
          initialQuality: 0.6,
        });
      } catch (ce) {
        console.warn("[DP] Compression failed, using original:", ce);
      }

      setUploadProgress(30);
      setUploadStep("Uploading...");

      const blob = new Blob([compressed], { type: "image/jpeg" });
      const url = await uploadToCloudinary(blob, (pct) => {
        setUploadProgress(30 + Math.round(pct * 0.7));
      });

      setUploadProgress(100);
      setUploadStep("Done!");
      setForm(f => ({ ...f, avatar: url }));
      
      showToast("Photo uploaded to cosmos!", "success");
    } catch (err: any) {
      setUploadProgress(0);
      setUploadStep("");
      showToast(`Upload failed: ${err?.code || err?.message || "Unknown"}`, "error");
    } finally {
      setUploading(false);
      setTimeout(() => { setUploadProgress(0); setUploadStep(""); }, 1500);
      if (e.target) e.target.value = "";
    }
  };

  const save = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const updated: UserProfile = { ...user, ...form };
      await updateUser(user.uid, { 
        name: form.name, 
        bio: form.bio, 
        gender: form.gender, 
        birthday: form.birthday, 
        avatar: form.avatar 
      });
      
      onUpdate(updated);
      showToast("Identity synced successfully!", "success");
      
      setTimeout(() => {
        onBack();
      }, 1500);
    } catch (err) {
      showToast("Failed to sync transmission. Try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  const isUrl = form.avatar.startsWith("http") || form.avatar.startsWith("data:");

  return (
    <div className="page-scroll" style={{ background: "#070212", minHeight: "100vh", color: "#e2e8f0" }}>
      
      {/* --- Cosmic Top Header Section --- */}
      <div style={{ 
        display: "flex", alignItems: "center", gap: 12, padding: "54px 16px 16px", 
        borderBottom: "1px solid rgba(147, 51, 234, 0.2)", background: "#0e0524" 
      }}>
        <button onClick={onBack} style={{
          width: 38, height: 38, borderRadius: 12, background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(147, 51, 234, 0.3)", cursor: "pointer", fontSize: 18, color: "#a78bfa",
        }}>{"\u2039"}</button>
        <h1 style={{ 
          fontSize: 16, fontWeight: 900, flex: 1, letterSpacing: "1.5px",
          textTransform: "uppercase", background: "linear-gradient(to right, #a78bfa, #f472b6, #22d3ee)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
        }}>Galaxy Identity</h1>
        <button className="btn btn-primary btn-sm" onClick={save} disabled={saving} style={{
          background: "linear-gradient(to right, #8b5cf6, #ec4899)", border: "none",
          boxShadow: "0 0 12px rgba(147,51,234,0.4)"
        }}>
          {saving ? "Syncing..." : "Save"}
        </button>
      </div>

      <div style={{ padding: "24px 16px", display: "flex", flexDirection: "column", gap: 20 }}>
        
        {/* --- Premium Radial Radar Avatar Wrapper --- */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div style={{ position: "relative" }}>
            <div style={{
              width: 100, height: 100, borderRadius: 50, overflow: "hidden",
              background: "#070212", border: "2px solid rgba(34, 211, 238, 0.4)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 20px rgba(139, 92, 246, 0.3)", padding: 4
            }}>
              <div style={{ width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden" }}>
                {isUrl ? (
                  <img src={form.avatar} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span style={{ fontSize: 44 }}>{form.avatar}</span>
                )}
              </div>
            </div>
            {uploading && (
              <div style={{
                position: "absolute", inset: 0, background: "rgba(7,2,18,0.8)", borderRadius: 50,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3,
              }}>
                <div style={{ width: 24, height: 24, borderRadius: 12, border: "2px solid rgba(34,211,238,0.3)", borderTopColor: "#22d3ee", animation: "spin 0.7s linear infinite" }} />
                <span style={{ fontSize: 11, color: "#fff", fontWeight: 800 }}>{uploadProgress}%</span>
              </div>
            )}
            <span style={{
              position: "absolute", bottom: -2, right: -2, background: "linear-gradient(to right, #22d3ee, #8b5cf6)",
              borderRadius: "50%", padding: 6, border: "1px solid #22d3ee", display: "flex", alignmentEvents: "none"
            }}>
              <Sparkles size={11} color="#fff" />
            </span>
          </div>
          
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()} disabled={uploading} style={{ border: "1px solid rgba(255,255,255,0.06)", fontSize: 11 }}>
              📸 Canvas Photo
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowPicker(true)} style={{ border: "1px solid rgba(255,255,255,0.06)", fontSize: 11 }}>
              🎭 Pick Avatar
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageUpload} />
        </div>

        {/* --- Card Form Wrapper --- */}
        <div style={{ background: "rgba(18, 6, 41, 0.9)", border: "1px solid rgba(147, 51, 234, 0.15)", borderRadius: 20, overflow: "hidden" }}>
          
          {/* Row 1: Nickname (Callsign) */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "between", padding: "14px 16px", borderBottom: "1px solid rgba(147,51,234,0.1)" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#c084fc", display: "flex", alignItems: "center", gap: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              <Compass size={14} color="#22d3ee" /> Callsign
            </span>
            <input style={{ background: "transparent", border: "none", color: "#fff", textAlign: "right", fontSize: 13, fontWeight: 700, outline: "none", flex: 1, paddingLeft: 20 }} 
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Set designation" />
          </div>

          {/* Row 2: Star-ID Module */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "between", padding: "14px 16px", borderBottom: "1px solid rgba(147,51,234,0.1)" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#c084fc", display: "flex", alignItems: "center", gap: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              <Moon size={14} color="#a855f7" /> Star-ID
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, justifyContent: "flex-end" }}>
              <span style={{ fontFamily: "monospace", fontSize: 12, color: "#22d3ee", background: "#060212", padding: "3px 8px", borderRadius: 6, border: "1px solid rgba(147,51,234,0.2)" }}>
                {`GXY_${user.uid.slice(0, 9).toUpperCase()}`}
              </span>
              <button onClick={handleCopyId} style={{ background: "#150a36", border: "1px solid rgba(147,51,234,0.3)", borderRadius: 6, padding: "4px 6px", cursor: "pointer", color: "#9ca3af", display: "flex", alignItems: "center" }}>
                {copied ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
              </button>
            </div>
          </div>

          {/* Row 3: Space Gender Select */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "between", padding: "14px 16px", borderBottom: "1px solid rgba(147,51,234,0.1)" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#c084fc", display: "flex", alignItems: "center", gap: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              <Zap size={14} color="#f472b6" /> Space Gender
            </span>
            <select style={{ background: "transparent", border: "none", color: "#f472b6", textAlign: "right", fontSize: 13, fontWeight: 700, outline: "none", direction: "rtl", cursor: "pointer" }}
              value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
              <option value="Cosmic Male" style={{ background: "#120a29", color: "#fff" }}>Cosmic Male ♂</option>
              <option value="Cosmic Female" style={{ background: "#120a29", color: "#fff" }}>Cosmic Female ♀</option>
              <option value="Nebula Binary" style={{ background: "#120a29", color: "#fff" }}>Nebula Binary 🛸</option>
            </select>
          </div>

          {/* Row 4: Space Log Date (Birthday) */}
          <div style={{ display: "flex", alignItems: "center", padding: "14px 16px", borderBottom: "1px solid rgba(147,51,234,0.1)", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#c084fc", display: "flex", alignItems: "center", gap: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              <Calendar size={14} color="#fbbf24" /> Space Log Date
            </span>
            <input type="date" style={{ background: "transparent", border: "none", color: "#fff", textTransform: "uppercase", fontSize: 12, fontWeight: 700, outline: "none", cursor: "pointer", colorScheme: "dark" }}
              value={form.birthday} onChange={e => setForm(f => ({ ...f, birthday: e.target.value }))} />
          </div>

          {/* Row 5: Core Element (Exclusive Field!) */}
          <div style={{ display: "flex", alignItems: "center", justifyBox: "between", padding: "14px 16px", borderBottom: "1px solid rgba(147,51,234,0.1)" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#c084fc", display: "flex", alignItems: "center", gap: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              <Shield size={14} color="#34d399" /> Core Element
            </span>
            <select style={{ background: "transparent", border: "none", color: "#34d399", textAlign: "right", fontSize: 13, fontWeight: 700, outline: "none", direction: "rtl", cursor: "pointer", flex: 1 }}
              value={form.cosmicElement} onChange={e => setForm(f => ({ ...f, cosmicElement: e.target.value }))}>
              <option value="Dark Matter" style={{ background: "#120a29", color: "#fff" }}>Dark Matter 🌌</option>
              <option value="Supernova" style={{ background: "#120a29", color: "#fff" }}>Supernova 🔥</option>
              <option value="Plasma Wave" style={{ background: "#120a29", color: "#fff" }}>Plasma Wave ⚡</option>
              <option value="Cosmic Dust" style={{ background: "#120a29", color: "#fff" }}>Cosmic Dust ✨</option>
            </select>
          </div>

          {/* Row 6: Cosmic Transmission (Bio Block) */}
          <div style={{ padding: 16, background: "rgba(10, 3, 31, 0.4)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 11, fontWeight: 700, color: "#a78bfa", textTransform: "uppercase" }}>
              <span>Cosmic Transmission (Bio)</span>
              <span style={{ fontFamily: "monospace", color: "#22d3ee" }}>{form.bio.length}/200</span>
            </div>
            <textarea style={{ 
              width: "100%", bg: "#060212", color: "#cbd5e1", fontSize: 13, borderRadius: 12, 
              padding: 12, border: "1px solid rgba(147,51,234,0.2)", outline: "none", background: "#060212",
              resize: "none", lineHeight: "1.5" 
            }} rows={3} value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} placeholder="Broadcast your signal here..." />
            {errors.name && <p style={{ fontSize: 11, color: "#ff6482", marginTop: 4 }}>{errors.name}</p>}
            {errors.bio && <p style={{ fontSize: 11, color: "#ff6482", marginTop: 4 }}>{errors.bio}</p>}
          </div>

        </div>

        {/* Save Execution Launcher */}
        <button className="btn btn-primary btn-full" style={{ 
          padding: "14px 0", fontSize: 14, fontWeight: 800, textTransform: "uppercase", letterSpacing: "1px",
          background: "linear-gradient(to right, #8b5cf6, #indigo-600, #ec4899)", border: "none",
          boxShadow: "0 4px 15px rgba(139,92,246,0.4)", borderRadius: 14
        }} onClick={save} disabled={saving}>
          {saving ? "Transmitting data..." : "\u2713 Initiate Sync Sequence"}
        </button>

      </div>

      {/* Emoji Picker Modal */}
      {showPicker && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(5,1,18,0.92)", backdropFilter: "blur(10px)",
          display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 400,
        }} onClick={() => setShowPicker(false)}>
          <div className="card" style={{
            width: "100%", maxWidth: 400, borderRadius: "24px 24px 0 0",
            padding: 24, animation: "slide-up 0.3s ease", background: "#120a29", borderTop: "2px solid #8b5cf6"
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 16, fontWeight: 900, marginBottom: 18, color: "#fff", textTransform: "uppercase", tracking: "1px" }}>Pick Portal Avatar</h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
              {AVATAR_LIST.map(a => (
                <button key={a} onClick={() => { setForm(f => ({ ...f, avatar: a })); setShowPicker(false); }} style={{
                  width: 54, height: 54, borderRadius: 16, fontSize: 30, border: "2px solid",
                  borderColor: form.avatar === a ? "#22d3ee" : "rgba(255,255,255,0.06)",
                  background: form.avatar === a ? "rgba(34,211,238,0.15)" : "rgba(255,255,255,0.02)",
                  cursor: "pointer", transition: "all 0.2s",
                  boxShadow: form.avatar === a ? "0 0 14px rgba(34,211,238,0.4)" : "none",
                }}>{a}</button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
