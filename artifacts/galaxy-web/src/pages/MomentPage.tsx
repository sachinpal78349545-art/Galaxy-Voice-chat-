import React, { useState, useEffect, useRef } from "react";
import { ref, push, set, onValue, off, update, get } from "firebase/database";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage, getVerifiedToken } from "../lib/firebase";
import { UserProfile } from "../lib/userService";
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
  const [postText, setPostText] = useState("");
  const [posting, setPosting] = useState(false);
  const [postImage, setPostImage] = useState<File | null>(null);
  const [postImagePreview, setPostImagePreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

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
    if (!postText.trim() && !postImage) return;
    setPosting(true);
    try {
      let imageUrl: string | undefined;
      if (postImage) {
        const token = await getVerifiedToken();
        console.log(`[Moment Upload] Final Token Check before upload: ${token ? token.substring(0, 40) + "..." : "EMPTY"}`);
        const ext = postImage.name.split(".").pop() || "jpg";
        const path = `moments/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const sRef = storageRef(storage, path);
        await uploadBytes(sRef, postImage, { customMetadata: { "X-Firebase-AppCheck": token } });
        imageUrl = await getDownloadURL(sRef);
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

  return (
    <div className="page-scroll">
      <div style={{ padding: "54px 16px 10px" }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, background: "linear-gradient(135deg,#A29BFE,#6C5CE7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Moments</h1>
        <p style={{ fontSize: 11, color: "rgba(162,155,254,0.4)", marginTop: 2 }}>See what's happening in the community</p>
      </div>

      <div style={{ padding: "0 16px 16px" }}>
        <div style={{
          display: "flex", gap: 10, alignItems: "flex-start",
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(108,92,231,0.15)",
          borderRadius: 18, padding: 14,
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: 19, fontSize: 18, flexShrink: 0,
            background: "linear-gradient(135deg, rgba(108,92,231,0.25), rgba(108,92,231,0.1))",
            border: "2px solid rgba(108,92,231,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
          }}>
            {user.avatar.startsWith?.("http") ? (
              <img src={user.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : user.avatar}
          </div>
          <div style={{ flex: 1 }}>
            <textarea
              className="input-field"
              placeholder="Share a moment..."
              value={postText}
              onChange={e => setPostText(e.target.value)}
              rows={2}
              disabled={posting}
              style={{ borderRadius: 14, padding: "10px 14px", fontSize: 13, resize: "none", minHeight: 44 }}
            />
            {postImagePreview && (
              <div style={{ position: "relative", marginTop: 8 }}>
                <img src={postImagePreview} alt="" style={{ width: "100%", maxHeight: 160, objectFit: "cover", borderRadius: 12 }} />
                <button onClick={() => { setPostImage(null); setPostImagePreview(null); }} style={{
                  position: "absolute", top: 4, right: 4, width: 24, height: 24, borderRadius: 12,
                  background: "rgba(0,0,0,0.6)", border: "none", color: "#fff", cursor: "pointer", fontSize: 12,
                }}>{"\u2715"}</button>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageSelect} />
              <button onClick={() => fileRef.current?.click()} disabled={posting} style={{
                background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "rgba(162,155,254,0.5)",
              }}>{"\u{1F4F7}"}</button>
              <button
                className="btn btn-primary btn-sm"
                style={{ fontSize: 12, padding: "7px 18px", opacity: (postText.trim() || postImage) ? 1 : 0.4 }}
                onClick={handlePost}
                disabled={posting || (!postText.trim() && !postImage)}
              >{posting ? "Posting..." : "Post"}</button>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 14 }}>
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card" style={{ padding: 16 }}>
              <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                <div className="skeleton" style={{ width: 40, height: 40, borderRadius: 20 }} />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                  <div className="skeleton skeleton-text" style={{ width: "40%" }} />
                  <div className="skeleton skeleton-text" style={{ width: "25%" }} />
                </div>
              </div>
              <div className="skeleton skeleton-text" style={{ width: "90%" }} />
              <div className="skeleton skeleton-text" style={{ width: "60%", marginTop: 6 }} />
            </div>
          ))
        ) : moments.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "rgba(162,155,254,0.4)" }}>
            <p style={{ fontSize: 32, marginBottom: 8 }}>{"\u{1F4F8}"}</p>
            <p style={{ fontSize: 14, fontWeight: 600 }}>No moments yet</p>
            <p style={{ fontSize: 12, marginTop: 4 }}>Be the first to share a moment!</p>
          </div>
        ) : (
          moments.map((m, i) => {
            const likeCount = Object.keys(m.likes).length;
            const isLiked = !!m.likes[user.uid];
            return (
              <div key={m.id} className="card" style={{ animation: `slide-up 0.3s ease ${i * 0.05}s both` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 20, fontSize: 20,
                    background: "linear-gradient(135deg, rgba(108,92,231,0.2), rgba(108,92,231,0.08))",
                    border: "2px solid rgba(108,92,231,0.3)",
                    display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
                  }}>
                    {m.userAvatar.startsWith?.("http") ? (
                      <img src={m.userAvatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : m.userAvatar}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 700 }}>{m.userName}</p>
                    <p style={{ fontSize: 10, color: "rgba(162,155,254,0.4)" }}>{getTimeAgo(m.createdAt)}</p>
                  </div>
                </div>

                {m.text && <p style={{ fontSize: 14, lineHeight: 1.6, color: "rgba(255,255,255,0.85)", marginBottom: m.imageUrl ? 12 : 14 }}>{m.text}</p>}

                {m.imageUrl && (
                  <img src={m.imageUrl} alt="" style={{ width: "100%", maxHeight: 280, objectFit: "cover", borderRadius: 14, marginBottom: 14 }} />
                )}

                <div style={{
                  display: "flex", gap: 20, paddingTop: 10,
                  borderTop: "1px solid rgba(255,255,255,0.05)",
                }}>
                  <button
                    onClick={() => handleLike(m.id)}
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 5,
                      color: isLiked ? "#ff6482" : "rgba(162,155,254,0.45)",
                      fontSize: 13, fontFamily: "inherit", fontWeight: 600,
                      transition: "all 0.2s",
                    }}
                  >
                    {isLiked ? "\u2764\uFE0F" : "\u{1F90D}"} {likeCount}
                  </button>
                  <button style={{
                    background: "none", border: "none", cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 5,
                    color: "rgba(162,155,254,0.45)", fontSize: 13, fontFamily: "inherit", fontWeight: 600,
                  }}>{"\u{1F4AC}"} {m.comments}</button>
                  <button style={{
                    background: "none", border: "none", cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 5,
                    color: "rgba(162,155,254,0.45)", fontSize: 13, fontFamily: "inherit", fontWeight: 600,
                  }}>{"\u{1F4E4}"} Share</button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
