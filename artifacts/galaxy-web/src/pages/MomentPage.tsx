import React, { useState } from "react";
import { UserProfile } from "../lib/userService";

interface Props { user: UserProfile; }

const SAMPLE_MOMENTS = [
  { id: "1", user: "StarGazer", avatar: "\u{1F31F}", text: "Just had an amazing voice chat session! The vibes were incredible \u2728", time: "2m ago", likes: 24, comments: 5, image: null },
  { id: "2", user: "CosmicDJ", avatar: "\u{1F3B5}", text: "New music room opening tonight at 9PM! Come join the party \u{1F389}", time: "15m ago", likes: 67, comments: 12, image: null },
  { id: "3", user: "LunaRose", avatar: "\u{1F319}", text: "Met so many amazing people on Galaxy today. This community is the best! \u{1F496}", time: "1h ago", likes: 103, comments: 28, image: null },
  { id: "4", user: "NightOwl", avatar: "\u{1F989}", text: "Late night chill room is live! Come hang out \u{1F30C}", time: "2h ago", likes: 45, comments: 8, image: null },
  { id: "5", user: "RocketX", avatar: "\u{1F680}", text: "Just reached Level 10! Thanks everyone for the support \u{1F525}", time: "3h ago", likes: 156, comments: 34, image: null },
  { id: "6", user: "NebulaDev", avatar: "\u{1F4BB}", text: "Gaming room was fire today! GG to everyone who joined \u{1F3AE}", time: "5h ago", likes: 89, comments: 15, image: null },
];

export default function MomentPage({ user }: Props) {
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [postText, setPostText] = useState("");

  const toggleLike = (id: string) => {
    setLiked(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>{user.avatar}</div>
          <div style={{ flex: 1 }}>
            <textarea
              className="input-field"
              placeholder="Share a moment..."
              value={postText}
              onChange={e => setPostText(e.target.value)}
              rows={2}
              style={{ borderRadius: 14, padding: "10px 14px", fontSize: 13, resize: "none", minHeight: 44 }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
              <button
                className="btn btn-primary btn-sm"
                style={{ fontSize: 12, padding: "7px 18px", opacity: postText.trim() ? 1 : 0.4 }}
                onClick={() => setPostText("")}
              >Post</button>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 14 }}>
        {SAMPLE_MOMENTS.map((m, i) => (
          <div key={m.id} className="card" style={{ animation: `slide-up 0.3s ease ${i * 0.05}s both` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 20, fontSize: 20,
                background: "linear-gradient(135deg, rgba(108,92,231,0.2), rgba(108,92,231,0.08))",
                border: "2px solid rgba(108,92,231,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>{m.avatar}</div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 700 }}>{m.user}</p>
                <p style={{ fontSize: 10, color: "rgba(162,155,254,0.4)" }}>{m.time}</p>
              </div>
              <button style={{
                background: "none", border: "none", cursor: "pointer",
                fontSize: 16, color: "rgba(162,155,254,0.3)",
              }}>{"\u22EF"}</button>
            </div>

            <p style={{ fontSize: 14, lineHeight: 1.6, color: "rgba(255,255,255,0.85)", marginBottom: 14 }}>{m.text}</p>

            <div style={{
              display: "flex", gap: 20, paddingTop: 10,
              borderTop: "1px solid rgba(255,255,255,0.05)",
            }}>
              <button
                onClick={() => toggleLike(m.id)}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 5,
                  color: liked.has(m.id) ? "#ff6482" : "rgba(162,155,254,0.45)",
                  fontSize: 13, fontFamily: "inherit", fontWeight: 600,
                  transition: "all 0.2s",
                }}
              >
                {liked.has(m.id) ? "\u2764\uFE0F" : "\u{1F90D}"} {m.likes + (liked.has(m.id) ? 1 : 0)}
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
        ))}
      </div>
    </div>
  );
}
