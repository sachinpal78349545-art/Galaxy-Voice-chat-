import React, { useState, useEffect, useRef } from "react";
import { ref, push, set, onValue, off, update, get, remove } from "firebase/database";
import { db, uploadWithAppCheck } from "../lib/firebase";
import { UserProfile, isSuperAdmin, SUPER_ADMIN_USER_ID } from "../lib/userService";
import { useToast } from "../lib/toastContext";

interface Moment {
  id: string;
  uid: string;
  userName: string;
  userAvatar: string;
  text: string;
  imageUrl?: string;
  likes: Record<string, boolean>;
  comments: number;
  createdAt: number;
}

interface Props { user: UserProfile; }

export default function MomentPage({ user }: Props) {
  const [moments, setMoments] = useState<Moment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [postText, setPostText] = useState("");
  const [posting, setPosting] = useState(false);
  const [postImage, setPostImage] = useState<File | null>(null);
  const [postImagePreview, setPostImagePreview] = useState<string | null>(null);
  const [viewingMoment, setViewingMoment] = useState<Moment | null>(null);
  const [tab, setTab] = useState<"all" | "mine">("all");
  const fileRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();
  const isAdmin = isSuperAdmin(user);

  useEffect(() => {
    const r = ref(db, "moments");
    onValue(r, snap => {
      if (!snap.exists()) { setMoments([]); setLoading(false); return; }
      const val = snap.val();
      const list: Moment[] = Object.keys(val).map(k => ({
        ...val[k],
        id: k,
        likes: val[k].likes || {},
      }));
      list.sort((a, b) => b.createdAt - a.createdAt);
      setMoments(list);
      setLoading(false);
    });
    return () => off(r);
  }, []);

  const handlePost = async () => {
    if (!postImage && !postText.trim()) { showToast("Add a photo or text", "warning"); return; }
    setPosting(true);
    try {
      let imageUrl: string | undefined;
      if (postImage) {
        const ext = postImage.name.split(".").pop() || "jpg";
        const path = `moments/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const result = await uploadWithAppCheck(postImage, path);
        imageUrl = result.url;
      }
      const momentRef = push(ref(db, "moments"));
      const momentData: any = {
        uid: user.uid,
        userName: user.name,
        userAvatar: user.avatar,
        text: postText.trim(),
        likes: {},
        comments: 0,
        createdAt: Date.now(),
      };
      if (imageUrl) momentData.imageUrl = imageUrl;
      await set(momentRef, momentData);
      setPostText("");
      setPostImage(null);
      setPostImagePreview(null);
      setShowCreate(false);
      showToast("Moment posted!", "success");
    } catch (err) {
      console.error("Post moment error:", err);
      showToast("Failed to post moment", "error");
    }
    setPosting(false);
  };

  const handleLike = async (momentId: string) => {
    const likeRef = ref(db, `moments/${momentId}/likes/${user.uid}`);
    const snap = await get(likeRef);
    if (snap.exists()) {
      await set(likeRef, null);
    } else {
      await set(likeRef, true);
    }
  };

  const handleDelete = async (momentId: string) => {
    try {
      await remove(ref(db, `moments/${momentId}`));
      setViewingMoment(null);
      showToast("Moment deleted", "info");
    } catch { showToast("Delete failed", "error"); }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast("Image must be under 5MB", "warning"); return; }
    setPostImage(file);
    const reader = new FileReader();
    reader.onload = () => setPostImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const getTimeAgo = (ts: number) => {
    const diff = Date.now() - ts;
    if (diff < 60000) return "just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  const filtered = tab === "mine" ? moments.filter(m => m.uid === user.uid) : moments;
  const imageMoments = filtered.filter(m => m.imageUrl);
  const textMoments = filtered.filter(m => !m.imageUrl);

  return (
    <div className="page-scroll">
      <div style={{ padding: "54px 16px 8px" }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, background: "linear-gradient(135deg,#A29BFE,#6C5CE7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Moments</h1>
        <p style={{ fontSize: 11, color: "rgba(162,155,254,0.4)", marginTop: 2 }}>See what's happening in the community</p>
      </div>

      <div style={{ display: "flex", gap: 0, padding: "0 16px 12px" }}>
        {(["all", "mine"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: "8px 0", fontSize: 13, fontWeight: tab === t ? 800 : 600, fontFamily: "inherit",
            background: "none", border: "none", cursor: "pointer",
            color: tab === t ? "#A29BFE" : "rgba(162,155,254,0.4)",
            borderBottom: tab === t ? "2px solid #6C5CE7" : "2px solid transparent",
          }}>{t === "all" ? "Discover" : "My Moments"}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: "0 16px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 3 }}>
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ aspectRatio: "1", borderRadius: 4 }} />
          ))}
        </div>
      ) : imageMoments.length === 0 && textMoments.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "rgba(162,155,254,0.4)" }}>
          <p style={{ fontSize: 32, marginBottom: 8 }}>{"\u{1F4F8}"}</p>
          <p style={{ fontSize: 14, fontWeight: 600 }}>No moments yet</p>
          <p style={{ fontSize: 12, marginTop: 4 }}>Be the first to share a moment!</p>
        </div>
      ) : (
        <>
          {imageMoments.length > 0 && (
            <div style={{ padding: "0 2px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2 }}>
              {imageMoments.map(m => {
                const likeCount = Object.keys(m.likes).length;
                return (
                  <div key={m.id} onClick={() => setViewingMoment(m)} style={{
                    position: "relative", aspectRatio: "1", cursor: "pointer", overflow: "hidden",
                  }}>
                    <img src={m.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <div style={{
                      position: "absolute", bottom: 0, left: 0, right: 0,
                      background: "linear-gradient(transparent, rgba(0,0,0,0.7))",
                      padding: "16px 6px 4px", display: "flex", alignItems: "center", gap: 4,
                    }}>
                      <span style={{ fontSize: 10, color: "#fff" }}>{"\u2764\uFE0F"} {likeCount}</span>
                    </div>
                    {(isAdmin || m.uid === user.uid) && (
                      <button onClick={e => { e.stopPropagation(); handleDelete(m.id); }} style={{
                        position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: 11,
                        background: "rgba(0,0,0,0.6)", border: "none", cursor: "pointer", fontSize: 11, color: "#ff6482",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>{"\u{1F5D1}\uFE0F"}</button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {textMoments.length > 0 && (
            <div style={{ padding: "12px 16px 0", display: "flex", flexDirection: "column", gap: 10 }}>
              {textMoments.map(m => {
                const likeCount = Object.keys(m.likes).length;
                const isLiked = !!m.likes[user.uid];
                return (
                  <div key={m.id} className="card" style={{ padding: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 16, fontSize: 16,
                        background: "rgba(108,92,231,0.15)", border: "2px solid rgba(108,92,231,0.3)",
                        display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
                      }}>
                        {m.userAvatar?.startsWith?.("http")
                          ? <img src={m.userAvatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          : m.userAvatar}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 13, fontWeight: 700 }}>{m.userName}</p>
                        <p style={{ fontSize: 9, color: "rgba(162,155,254,0.4)" }}>{getTimeAgo(m.createdAt)}</p>
                      </div>
                      {(isAdmin || m.uid === user.uid) && (
                        <button onClick={() => handleDelete(m.id)} style={{
                          background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "rgba(255,100,130,0.6)", padding: 4,
                        }}>{"\u{1F5D1}\uFE0F"}</button>
                      )}
                    </div>
                    <p style={{ fontSize: 13, lineHeight: 1.6, color: "rgba(255,255,255,0.8)" }}>{m.text}</p>
                    <div style={{ display: "flex", gap: 16, marginTop: 10, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                      <button onClick={() => handleLike(m.id)} style={{
                        background: "none", border: "none", cursor: "pointer", fontSize: 12, fontFamily: "inherit",
                        color: isLiked ? "#ff6482" : "rgba(162,155,254,0.45)", fontWeight: 600, display: "flex", alignItems: "center", gap: 4,
                      }}>{isLiked ? "\u2764\uFE0F" : "\u{1F90D}"} {likeCount}</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      <div style={{ height: 80 }} />

      <button onClick={() => setShowCreate(true)} style={{
        position: "fixed", bottom: 80, right: 20, width: 56, height: 56, borderRadius: 28,
        background: "linear-gradient(135deg, #6C5CE7, #A29BFE)", border: "none", cursor: "pointer",
        boxShadow: "0 4px 20px rgba(108,92,231,0.5)", display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 28, color: "#fff", zIndex: 10,
      }}>+</button>

      {showCreate && (
        <div onClick={() => { if (!posting) setShowCreate(false); }} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200,
          display: "flex", alignItems: "flex-end", justifyContent: "center",
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            width: "100%", maxWidth: 430, background: "#1A0F2E", borderRadius: "20px 20px 0 0",
            padding: "20px 16px 32px", animation: "slide-up 0.3s ease",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, fontWeight: 900 }}>{"\u{1F4F8}"} New Moment</h3>
              <button onClick={() => setShowCreate(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "rgba(162,155,254,0.5)" }}>{"\u2715"}</button>
            </div>

            <textarea
              className="input-field"
              placeholder="What's on your mind?"
              value={postText}
              onChange={e => setPostText(e.target.value)}
              rows={3}
              disabled={posting}
              style={{ borderRadius: 14, padding: "12px 14px", fontSize: 14, resize: "none", minHeight: 60, marginBottom: 12 }}
            />

            {postImagePreview ? (
              <div style={{ position: "relative", marginBottom: 12 }}>
                <img src={postImagePreview} alt="" style={{ width: "100%", maxHeight: 200, objectFit: "cover", borderRadius: 14 }} />
                <button onClick={() => { setPostImage(null); setPostImagePreview(null); }} style={{
                  position: "absolute", top: 6, right: 6, width: 28, height: 28, borderRadius: 14,
                  background: "rgba(0,0,0,0.7)", border: "none", color: "#fff", cursor: "pointer", fontSize: 14,
                }}>{"\u2715"}</button>
              </div>
            ) : (
              <button onClick={() => fileRef.current?.click()} disabled={posting} style={{
                width: "100%", padding: "24px 0", borderRadius: 14, border: "2px dashed rgba(108,92,231,0.3)",
                background: "rgba(108,92,231,0.06)", cursor: "pointer", color: "rgba(162,155,254,0.5)",
                fontSize: 14, fontFamily: "inherit", marginBottom: 12,
              }}>{"\u{1F4F7}"} Add Photo</button>
            )}

            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageSelect} />

            <button
              className="btn btn-primary btn-full"
              style={{ padding: "14px 0", borderRadius: 14, fontSize: 15, fontWeight: 800, opacity: (postText.trim() || postImage) ? 1 : 0.4 }}
              onClick={handlePost}
              disabled={posting || (!postText.trim() && !postImage)}
            >{posting ? "Posting..." : "Post Moment"}</button>
          </div>
        </div>
      )}

      {viewingMoment && (
        <div onClick={() => setViewingMoment(null)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", zIndex: 200,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        }}>
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 430, maxHeight: "85vh", overflow: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 16px 12px" }}>
              <div style={{
                width: 36, height: 36, borderRadius: 18, fontSize: 18,
                background: "rgba(108,92,231,0.15)", border: "2px solid rgba(108,92,231,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
              }}>
                {viewingMoment.userAvatar?.startsWith?.("http")
                  ? <img src={viewingMoment.userAvatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : viewingMoment.userAvatar}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{viewingMoment.userName}</p>
                <p style={{ fontSize: 10, color: "rgba(162,155,254,0.5)" }}>{getTimeAgo(viewingMoment.createdAt)}</p>
              </div>
              {(isAdmin || viewingMoment.uid === user.uid) && (
                <button onClick={() => handleDelete(viewingMoment.id)} style={{
                  background: "rgba(255,100,130,0.15)", border: "1px solid rgba(255,100,130,0.3)",
                  borderRadius: 10, padding: "6px 12px", cursor: "pointer", fontSize: 12, color: "#ff6482", fontFamily: "inherit", fontWeight: 700,
                }}>{"\u{1F5D1}\uFE0F"} Delete</button>
              )}
              <button onClick={() => setViewingMoment(null)} style={{
                background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 10,
                padding: "6px 10px", cursor: "pointer", fontSize: 16, color: "#fff",
              }}>{"\u2715"}</button>
            </div>

            {viewingMoment.imageUrl && (
              <img src={viewingMoment.imageUrl} alt="" style={{ width: "100%", maxHeight: "60vh", objectFit: "contain" }} />
            )}

            {viewingMoment.text && (
              <p style={{ padding: "12px 16px", fontSize: 14, lineHeight: 1.6, color: "rgba(255,255,255,0.85)" }}>{viewingMoment.text}</p>
            )}

            <div style={{ display: "flex", gap: 16, padding: "12px 16px" }}>
              <button onClick={() => handleLike(viewingMoment.id)} style={{
                background: "none", border: "none", cursor: "pointer", fontSize: 14, fontFamily: "inherit",
                color: viewingMoment.likes[user.uid] ? "#ff6482" : "rgba(162,155,254,0.5)", fontWeight: 600,
                display: "flex", alignItems: "center", gap: 5,
              }}>{viewingMoment.likes[user.uid] ? "\u2764\uFE0F" : "\u{1F90D}"} {Object.keys(viewingMoment.likes).length}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
