import React, { useState, useRef } from "react";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage as fbStorage } from "../lib/firebase";
import { UserProfile, updateUser, AVATAR_LIST } from "../lib/userService";
import { useToast } from "../lib/toastContext";

interface Props { user: UserProfile; onUpdate: (u: UserProfile) => void; onBack: () => void; }

export default function EditProfilePage({ user, onUpdate, onBack }: Props) {
  const [form, setForm] = useState({
    name: user.name,
    bio: user.bio,
    gender: user.gender,
    birthday: user.birthday,
    avatar: user.avatar,
  });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Username is required";
    if (form.name.length > 30) errs.name = "Max 30 characters";
    if (form.bio.length > 200) errs.bio = "Max 200 characters";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const compressImage = (file: File, maxW = 600, maxH = 600, quality = 0.7): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > maxW || h > maxH) {
          const ratio = Math.min(maxW / w, maxH / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("Canvas not supported")); return; }
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(
          blob => blob ? resolve(blob) : reject(new Error("Compression failed")),
          "image/jpeg",
          quality
        );
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = URL.createObjectURL(file);
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      showToast("Image must be under 10MB", "warning");
      return;
    }
    setUploading(true);
    setUploadProgress(0);

    let progressSim: ReturnType<typeof setInterval> | null = null;
    let uploadTimedOut = false;

    try {
      setUploadProgress(10);
      let blob: Blob;
      try {
        blob = await compressImage(file);
        setUploadProgress(30);
      } catch {
        blob = file;
        setUploadProgress(30);
      }

      progressSim = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 85) { return 85; }
          return prev + 5;
        });
      }, 300);

      const uploadTimeout = new Promise<never>((_, reject) =>
        setTimeout(() => { uploadTimedOut = true; reject(new Error("Upload timed out")); }, 60000)
      );

      const path = `avatars/${user.uid}_${Date.now()}`;
      const sRef = storageRef(fbStorage, path);
      const doUpload = async () => {
        await uploadBytes(sRef, blob);
        return await getDownloadURL(sRef);
      };

      const url = await Promise.race([doUpload(), uploadTimeout]);

      if (progressSim) clearInterval(progressSim);
      setUploadProgress(100);
      setForm(f => ({ ...f, avatar: url }));
      showToast("Photo uploaded!", "success", "\u{1F4F7}");
    } catch (err) {
      if (progressSim) clearInterval(progressSim);
      setUploadProgress(0);
      console.error("Upload failed:", err);

      if (uploadTimedOut) {
        showToast("Upload timed out. Try a smaller photo.", "error");
      } else {
        showToast("Upload failed. Please try again.", "error");
      }
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 800);
      if (e.target) e.target.value = "";
    }
  };

  const save = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const updated: UserProfile = { ...user, ...form };
      await updateUser(user.uid, { name: form.name, bio: form.bio, gender: form.gender, birthday: form.birthday, avatar: form.avatar });
      onUpdate(updated);
      setSaved(true);
      showToast("Profile saved!", "success", "\u2705");
      setTimeout(() => {
        setSaved(false);
        onBack();
      }, 1500);
    } catch (err) {
      showToast("Failed to save. Try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  const isUrl = form.avatar.startsWith("http") || form.avatar.startsWith("data:");

  return (
    <div className="page-scroll">
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "54px 16px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <button onClick={onBack} style={{
          width: 38, height: 38, borderRadius: 12, background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.09)", cursor: "pointer", fontSize: 18, color: "#fff",
        }}>{"\u2039"}</button>
        <h1 style={{ fontSize: 18, fontWeight: 900, flex: 1 }}>Edit Profile {"\u270F\uFE0F"}</h1>
        <button className="btn btn-primary btn-sm" onClick={save} disabled={saving || saved}>
          {saved ? "\u2705 Saved!" : saving ? "Saving..." : "Save"}
        </button>
      </div>

      {/* Success overlay */}
      {saved && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(5,1,18,0.6)", backdropFilter: "blur(4px)",
        }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <div style={{
              width: 80, height: 80, borderRadius: 40, background: "rgba(0,230,118,0.15)",
              border: "3px solid rgba(0,230,118,0.5)", display: "flex", alignItems: "center", justifyContent: "center",
              animation: "successPulse 0.5s ease",
            }}>
              <span style={{ fontSize: 40 }}>{"\u2705"}</span>
            </div>
            <p style={{ fontSize: 18, fontWeight: 800, color: "#00e676" }}>Profile Saved!</p>
            {["\u{1F389}", "\u2728", "\u{1F31F}", "\u{1F4AB}", "\u{1F38A}"].map((c, i) => (
              <div key={i} style={{
                position: "absolute",
                left: `${20 + i * 15}%`, top: "40%",
                fontSize: 24, animation: `confetti 1.5s ease-out ${i * 0.1}s forwards`,
                pointerEvents: "none",
              }}>{c}</div>
            ))}
          </div>
        </div>
      )}

      <div style={{ padding: "24px 16px", display: "flex", flexDirection: "column", gap: 22 }}>
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
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4,
              }}>
                <div style={{ width: 24, height: 24, borderRadius: 12, border: "2.5px solid rgba(162,155,254,0.3)", borderTopColor: "#A29BFE", animation: "spin 0.7s linear infinite" }} />
                <span style={{ fontSize: 10, color: "#A29BFE", fontWeight: 700 }}>{uploadProgress}%</span>
              </div>
            )}
            {uploadProgress > 0 && uploadProgress < 100 && !uploading && (
              <div style={{
                position: "absolute", bottom: -4, left: 8, right: 8, height: 3, borderRadius: 2,
                background: "rgba(255,255,255,0.1)",
              }}>
                <div style={{
                  height: "100%", borderRadius: 2, width: `${uploadProgress}%`,
                  background: "linear-gradient(90deg,#6C5CE7,#A29BFE)", transition: "width 0.3s",
                }} />
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {"\u{1F4F7}"} Upload Photo
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowPicker(true)}>
              {"\u{1F3AD}"} Pick Emoji
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageUpload} />
        </div>

        <div>
          <label style={{ fontSize: 12, color: "rgba(162,155,254,0.55)", fontWeight: 700, marginBottom: 7, display: "block" }}>Username</label>
          <input className="input-field" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Your name"
            style={{ borderColor: errors.name ? "rgba(255,100,130,0.5)" : undefined }} />
          {errors.name && <p style={{ fontSize: 11, color: "#ff6482", marginTop: 4 }}>{errors.name}</p>}
        </div>

        <div>
          <label style={{ fontSize: 12, color: "rgba(162,155,254,0.55)", fontWeight: 700, marginBottom: 7, display: "block" }}>UID (auto-generated)</label>
          <input className="input-field" value={user.uid.toUpperCase()} readOnly style={{ opacity: 0.5, cursor: "not-allowed" }} />
        </div>

        <div>
          <label style={{ fontSize: 12, color: "rgba(162,155,254,0.55)", fontWeight: 700, marginBottom: 7, display: "flex", justifyContent: "space-between" }}>
            <span>About Me</span>
            <span style={{ color: form.bio.length > 180 ? "#ff6482" : "rgba(162,155,254,0.3)" }}>{form.bio.length}/200</span>
          </label>
          <textarea className="input-field" rows={3} value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} placeholder="Tell the galaxy about yourself..."
            style={{ borderColor: errors.bio ? "rgba(255,100,130,0.5)" : undefined }} />
          {errors.bio && <p style={{ fontSize: 11, color: "#ff6482", marginTop: 4 }}>{errors.bio}</p>}
        </div>

        <div>
          <label style={{ fontSize: 12, color: "rgba(162,155,254,0.55)", fontWeight: 700, marginBottom: 7, display: "block" }}>Gender</label>
          <select className="input-field" value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
            {["Male", "Female", "Non-binary", "Other", "Prefer not to say"].map(g => <option key={g}>{g}</option>)}
          </select>
        </div>

        <div>
          <label style={{ fontSize: 12, color: "rgba(162,155,254,0.55)", fontWeight: 700, marginBottom: 7, display: "block" }}>Birthday</label>
          <input className="input-field" type="date" value={form.birthday} onChange={e => setForm(f => ({ ...f, birthday: e.target.value }))} />
        </div>

        <button className="btn btn-primary btn-full" style={{ padding: "15px 0", fontSize: 15 }} onClick={save} disabled={saving || saved}>
          {saved ? "\u2705 Saved!" : saving ? "Saving..." : "\u2713 Save Changes"}
        </button>
      </div>

      {showPicker && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(5,1,18,0.88)", backdropFilter: "blur(10px)",
          display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 400,
        }} onClick={() => setShowPicker(false)}>
          <div className="card" style={{
            width: "100%", maxWidth: 400, borderRadius: "24px 24px 0 0",
            padding: 24, animation: "slide-up 0.3s ease",
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 17, fontWeight: 900, marginBottom: 18 }}>Pick Avatar {"\u{1F3AD}"}</h2>
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
