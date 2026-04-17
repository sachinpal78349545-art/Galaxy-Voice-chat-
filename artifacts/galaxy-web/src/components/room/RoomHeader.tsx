import React from "react";
import { Share2, MoreHorizontal, X, Users } from "lucide-react";
import { Room } from "./types";

interface RoomHeaderProps {
  room: Room;
  myRole: "owner" | "admin" | "user";
  liveCount: number;
  elapsed: string;
  hasControl: boolean;
  onOpenControlPanel: () => void;
  onShowUsersPanel: () => void;
  onShowCloseMenu: () => void;
  onLoadLeaderboard: () => void;
  onShare: () => void;
}

// Shared glassmorphism panel — slightly rectangular, soft gold ambient
const glass: React.CSSProperties = {
  background: "rgba(14, 8, 32, 0.55)",
  border: "1px solid rgba(255, 215, 0, 0.13)",
  borderRadius: 14,
  backdropFilter: "blur(18px)",
  WebkitBackdropFilter: "blur(18px)",
  boxShadow: "0 4px 24px rgba(0,0,0,0.45), 0 0 20px rgba(255,200,80,0.08)",
};

// Thin vertical separator inside panels
const Sep = () => (
  <span style={{
    display: "inline-block", width: 1, height: 16,
    background: "rgba(255,255,255,0.1)", flexShrink: 0, margin: "0 2px",
  }} />
);

// Icon action button inside panel
const IBtn = ({
  onClick, children, danger = false, title,
}: {
  onClick?: () => void;
  children: React.ReactNode;
  danger?: boolean;
  title?: string;
}) => (
  <button onClick={onClick} title={title} style={{
    width: 30, height: 30, borderRadius: 8,
    background: "transparent", border: "none",
    color: danger ? "rgba(255,100,100,0.9)" : "rgba(255,255,255,0.82)",
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", padding: 0, flexShrink: 0,
  }}>
    {children}
  </button>
);

export default function RoomHeader({
  room, myRole, liveCount,
  onOpenControlPanel, onShowUsersPanel, onShowCloseMenu, onLoadLeaderboard, onShare,
}: RoomHeaderProps) {
  const avatarSrc = room.roomAvatar || "";
  const avatarEmoji = room.coverEmoji || "🎤";
  const lbValue = (liveCount * 0.95 + 7.23).toFixed(2);
  const previewUsers = Object.values(room.roomUsers || {}).slice(0, 2);

  return (
    <>
      <div style={{
        position: "relative", zIndex: 5,
        padding: "46px 10px 6px",
        display: "flex", alignItems: "center",
        justifyContent: "space-between", gap: 8,
      }}>

        {/* ── LEFT PANEL: avatar flush-left → name → ID → trophy ── */}
        <div
          onClick={onOpenControlPanel}
          style={{
            ...glass,
            display: "flex", alignItems: "center",
            padding: "0 10px 0 0",
            gap: 0, maxWidth: "60%", cursor: "pointer", overflow: "hidden",
          }}
        >
          {/* Avatar — flush against left edge, no gap */}
          <div style={{
            width: 44, height: 44, flexShrink: 0,
            borderRadius: "12px 0 0 12px",
            background: "linear-gradient(135deg, rgba(108,92,231,0.55), rgba(45,20,80,0.6))",
            border: "none",
            borderRight: "1px solid rgba(255,215,0,0.12)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, overflow: "hidden",
          }}>
            {avatarSrc
              ? <img src={avatarSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : avatarEmoji}
          </div>

          {/* Text block */}
          <div style={{ paddingLeft: 9, paddingRight: 4, paddingTop: 5, paddingBottom: 5, minWidth: 0, flex: 1 }}>
            <p style={{
              margin: 0, fontSize: 12.5, fontWeight: 700,
              color: "#ffffff", letterSpacing: 0.05,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              lineHeight: 1.3,
            }}>{room.name}</p>

            <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
              <span style={{ fontSize: 9, color: "rgba(255,255,255,0.38)", fontWeight: 500, letterSpacing: 0.3 }}>
                ID {room.id.slice(5, 14).toUpperCase()}
              </span>
              {/* Trophy badge — compact */}
              <button
                onClick={(e) => { e.stopPropagation(); onLoadLeaderboard(); }}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 2,
                  background: "rgba(255,193,7,0.14)",
                  border: "1px solid rgba(255,215,0,0.3)",
                  borderRadius: 6, padding: "1px 6px 1px 4px",
                  cursor: "pointer", fontFamily: "inherit",
                  color: "#FFD700", fontSize: 9.5, fontWeight: 700, lineHeight: 1,
                }}
              >
                🏆 {lbValue}K
              </button>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL: ONE structured group ── viewers | share · more | close ── */}
        <div style={{
          ...glass,
          display: "flex", alignItems: "center",
          padding: "4px 5px 4px 4px", gap: 0,
          flexShrink: 0,
        }}>
          {/* Viewers cluster */}
          <button
            onClick={onShowUsersPanel}
            style={{
              display: "flex", alignItems: "center", gap: 4,
              background: "none", border: "none", cursor: "pointer",
              padding: "2px 6px", fontFamily: "inherit",
            }}
          >
            {/* stacked mini-avatars */}
            <div style={{ display: "flex", alignItems: "center", marginRight: 2 }}>
              {previewUsers.length > 0
                ? previewUsers.map((u, i) => (
                    <div key={i} style={{
                      width: 20, height: 20, borderRadius: 10, overflow: "hidden",
                      border: "1.5px solid rgba(255,215,0,0.28)",
                      background: "rgba(108,92,231,0.4)",
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11,
                      marginLeft: i === 0 ? 0 : -6, position: "relative", zIndex: 2 - i,
                    }}>
                      {(u.avatar || "").startsWith("http")
                        ? <img src={u.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : (u.avatar || "👤")}
                    </div>
                  ))
                : <div style={{
                    width: 20, height: 20, borderRadius: 10,
                    background: "rgba(108,92,231,0.35)",
                    border: "1.5px solid rgba(255,215,0,0.25)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "rgba(255,255,255,0.6)",
                  }}><Users size={10} /></div>
              }
            </div>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.85)", fontWeight: 700 }}>
              {liveCount}
            </span>
          </button>

          <Sep />

          {/* Share */}
          <IBtn onClick={onShare} title="Share">
            <Share2 size={13} strokeWidth={2.5} />
          </IBtn>

          {/* More */}
          <IBtn onClick={onOpenControlPanel} title="More options">
            <MoreHorizontal size={14} strokeWidth={2.5} />
          </IBtn>

          <Sep />

          {/* Close */}
          <IBtn onClick={onShowCloseMenu} danger title="Leave room">
            <X size={13} strokeWidth={2.8} />
          </IBtn>
        </div>
      </div>

      {myRole !== "user" && (
        <div className="room-role-bar" style={{ position: "relative", zIndex: 5 }}>
          <span className={myRole === "owner" ? "room-role-tag room-role-owner" : "room-role-tag room-role-admin"}>
            {myRole === "owner" ? "👑 Owner" : "🛡️ Admin"}
          </span>
          {room.micPermission && room.micPermission !== "all" && (
            <span className="room-role-tag room-role-mic">
              🎤 Mic: {room.micPermission === "request" ? "Request" : "Admin Only"}
            </span>
          )}
          {room.isPrivate && <span className="room-role-tag room-role-private">🔒 Private</span>}
        </div>
      )}
    </>
  );
}
