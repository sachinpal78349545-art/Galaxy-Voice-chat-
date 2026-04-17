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

export default function RoomHeader({
  room, myRole, liveCount,
  onOpenControlPanel, onShowUsersPanel, onShowCloseMenu, onLoadLeaderboard, onShare,
}: RoomHeaderProps) {
  const avatarSrc = room.roomAvatar || "";
  const avatarEmoji = room.coverEmoji || "🎤";
  const lbValue = (liveCount * 0.95 + 7.23).toFixed(2);
  const previewUsers = Object.values(room.roomUsers || {}).slice(0, 3);

  const glassPanel: React.CSSProperties = {
    background: "rgba(18,10,38,0.52)",
    border: "1px solid rgba(255,215,0,0.14)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    boxShadow: "0 4px 20px rgba(0,0,0,0.4), 0 0 18px rgba(255,200,80,0.1)",
  };

  return (
    <>
      <div style={{
        position: "relative", zIndex: 5,
        padding: "46px 10px 6px",
        display: "flex", alignItems: "flex-start",
        justifyContent: "space-between", gap: 8,
      }}>

        {/* ── LEFT: room info panel ── */}
        <div
          onClick={onOpenControlPanel}
          style={{
            ...glassPanel,
            borderRadius: 20,
            padding: "0 12px 0 0",
            display: "flex", alignItems: "center", gap: 0,
            maxWidth: "60%", cursor: "pointer", overflow: "hidden",
          }}
        >
          {/* Avatar — flush to left edge, slightly taller than panel */}
          <div style={{
            width: 48, height: 48, borderRadius: 16,
            background: "linear-gradient(135deg, rgba(108,92,231,0.5), rgba(74,222,128,0.2))",
            border: "2px solid rgba(255,215,0,0.55)",
            boxShadow: "0 0 10px rgba(255,215,0,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 24, flexShrink: 0, overflow: "hidden",
            margin: "0 10px 0 0",
          }}>
            {avatarSrc
              ? <img src={avatarSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : avatarEmoji}
          </div>

          <div style={{ minWidth: 0, flex: 1, paddingTop: 6, paddingBottom: 6 }}>
            {/* Room name */}
            <p style={{
              margin: 0, fontSize: 13, fontWeight: 700,
              color: "#fff", letterSpacing: 0.1,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>{room.name}</p>

            {/* ID + trophy score row */}
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
              <span style={{
                fontSize: 9.5, color: "rgba(255,255,255,0.45)",
                fontWeight: 500, letterSpacing: 0.2,
              }}>ID {room.id.slice(5, 14).toUpperCase()}</span>

              <button
                onClick={(e) => { e.stopPropagation(); onLoadLeaderboard(); }}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 3,
                  background: "linear-gradient(90deg, rgba(255,193,7,0.22), rgba(255,120,0,0.14))",
                  border: "1px solid rgba(255,215,0,0.38)",
                  borderRadius: 8, padding: "1px 7px 1px 4px",
                  cursor: "pointer", fontFamily: "inherit",
                  color: "#FFD700", fontSize: 10, fontWeight: 700,
                }}>
                <span style={{ fontSize: 11 }}>🏆</span>
                <span>{lbValue}K</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── RIGHT: single glass action panel ── */}
        <div style={{
          ...glassPanel,
          borderRadius: 20,
          padding: "5px 7px",
          display: "flex", alignItems: "center", gap: 0,
        }}>
          {/* Online viewers cluster */}
          <button
            onClick={onShowUsersPanel}
            style={{
              display: "flex", alignItems: "center", gap: 4,
              background: "none", border: "none", cursor: "pointer",
              padding: "2px 8px 2px 4px", fontFamily: "inherit",
            }}
          >
            {/* Stacked mini-avatars */}
            <div style={{ display: "flex", alignItems: "center" }}>
              {previewUsers.length > 0
                ? previewUsers.slice(0, 2).map((u, i) => (
                    <div key={i} style={{
                      width: 22, height: 22, borderRadius: 11, overflow: "hidden",
                      border: "1.5px solid rgba(255,215,0,0.35)",
                      background: "rgba(108,92,231,0.35)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 12,
                      marginLeft: i === 0 ? 0 : -7,
                      zIndex: 2 - i,
                      position: "relative",
                    }}>
                      {(u.avatar || "").startsWith("http")
                        ? <img src={u.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : (u.avatar || "👤")}
                    </div>
                  ))
                : <div style={{
                    width: 22, height: 22, borderRadius: 11,
                    background: "rgba(108,92,231,0.35)",
                    border: "1.5px solid rgba(255,215,0,0.3)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, color: "#fff",
                  }}><Users size={11} /></div>
              }
            </div>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.9)", fontWeight: 700 }}>
              {liveCount}
            </span>
          </button>

          {/* Divider */}
          <span style={{ width: 1, height: 18, background: "rgba(255,215,0,0.18)", flexShrink: 0 }} />

          {/* Share */}
          <button onClick={onShare} title="Share" style={actionBtn}>
            <Share2 size={14} strokeWidth={2.4} />
          </button>

          {/* More */}
          <button onClick={onOpenControlPanel} title="More" style={actionBtn}>
            <MoreHorizontal size={15} strokeWidth={2.4} />
          </button>

          {/* Divider */}
          <span style={{ width: 1, height: 18, background: "rgba(255,255,255,0.12)", flexShrink: 0 }} />

          {/* Close */}
          <button onClick={onShowCloseMenu} title="Leave" style={{ ...actionBtn, color: "rgba(255,120,120,0.9)" }}>
            <X size={14} strokeWidth={2.6} />
          </button>
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

const actionBtn: React.CSSProperties = {
  width: 30, height: 30, borderRadius: 15,
  background: "transparent", border: "none",
  color: "rgba(255,255,255,0.85)",
  display: "flex", alignItems: "center", justifyContent: "center",
  cursor: "pointer", padding: 0, flexShrink: 0,
};
