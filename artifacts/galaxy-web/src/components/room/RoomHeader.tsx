import React from "react";
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
  const avatarContent = (room.roomAvatar || room.coverEmoji || "\u{1F3A4}");
  const lbValue = (liveCount * 0.95 + 7.23).toFixed(2);
  const previewUsers = Object.values(room.roomUsers || {}).slice(0, 1);

  // Shared semi-transparent panel base with gold outline
  const panelBase: React.CSSProperties = {
    background: "rgba(20,12,40,0.45)",
    border: "1px solid rgba(255,215,0,0.45)",
    borderRadius: 24,
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    boxShadow: "0 2px 14px rgba(0,0,0,0.35), inset 0 0 12px rgba(255,215,0,0.08)",
  };

  return (
    <>
      <div style={{
        position: "relative", zIndex: 5, padding: "44px 10px 8px",
        display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8,
      }}>
        {/* LEFT: connected avatar + name + ID + trophy badge — single panel */}
        <div style={{ ...panelBase, padding: "4px 12px 4px 4px", display: "flex", alignItems: "center", gap: 8, maxWidth: "65%" }}
          onClick={onOpenControlPanel}>
          <div style={{
            width: 40, height: 40, borderRadius: 20, overflow: "hidden",
            background: "rgba(108,92,231,0.25)",
            border: "2px solid rgba(255,215,0,0.7)",
            boxShadow: "0 0 8px rgba(255,215,0,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, flexShrink: 0,
          }}>
            {avatarContent.startsWith?.("http")
              ? <img src={room.roomAvatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : avatarContent}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <h2 style={{
                fontSize: 13, fontWeight: 800, color: "#fff",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>{room.name}</h2>
              <span style={{ fontSize: 12 }}>{"\u{1F381}"}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 1 }}>
              <span style={{ fontSize: 9, color: "rgba(255,255,255,0.6)" }}>ID:{room.id.slice(5, 14)}</span>
              <button onClick={(e) => { e.stopPropagation(); onLoadLeaderboard(); }} style={{
                display: "inline-flex", alignItems: "center", gap: 3,
                background: "linear-gradient(90deg, rgba(255,193,7,0.25), rgba(255,140,0,0.18))",
                border: "1px solid rgba(255,215,0,0.55)",
                borderRadius: 10, padding: "1px 8px 1px 5px",
                cursor: "pointer", fontFamily: "inherit", color: "#FFD700",
                fontSize: 10, fontWeight: 800, lineHeight: 1.4,
              }}>
                <span style={{ fontSize: 11 }}>{"\u{1F3C6}"}</span>
                <span>{lbValue}K</span>
                <span style={{ fontSize: 8, color: "rgba(255,215,0,0.7)" }}>{"\u203A"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT: grouped action panel — share + menu + close + viewer count in ONE pill panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
          <div style={{ ...panelBase, padding: "4px 6px", display: "flex", alignItems: "center", gap: 4 }}>
            <button onClick={onShare} title="Share" style={iconBtn}>{"\u2197"}</button>
            <span style={divider} />
            <button onClick={onOpenControlPanel} title="Menu" style={iconBtn}>{"\u22EF"}</button>
            <span style={divider} />
            <button onClick={onShowCloseMenu} title="Close" style={iconBtn}>{"\u2715"}</button>
          </div>

          {/* Online viewer pill — also gold-outline panel */}
          <button onClick={onShowUsersPanel} style={{
            ...panelBase, borderRadius: 20,
            display: "flex", alignItems: "center", gap: 5,
            padding: "2px 10px 2px 2px", cursor: "pointer", fontFamily: "inherit",
          }}>
            {previewUsers[0] ? (
              <div style={{
                width: 26, height: 26, borderRadius: 13, overflow: "hidden",
                background: "rgba(108,92,231,0.25)", border: "1.5px solid rgba(255,215,0,0.5)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
              }}>
                {previewUsers[0].avatar?.startsWith?.("http")
                  ? <img src={previewUsers[0].avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : (previewUsers[0].avatar || "\u{1F464}")}
              </div>
            ) : (
              <div style={{
                width: 26, height: 26, borderRadius: 13,
                background: "rgba(108,92,231,0.25)", border: "1.5px solid rgba(255,215,0,0.5)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13,
              }}>{"\u{1F464}"}</div>
            )}
            <span style={{ fontSize: 12, color: "#fff", fontWeight: 700 }}>{liveCount}</span>
          </button>
        </div>
      </div>

      {myRole !== "user" && (
        <div className="room-role-bar" style={{ position: "relative", zIndex: 5 }}>
          <span className={myRole === "owner" ? "room-role-tag room-role-owner" : "room-role-tag room-role-admin"}>
            {myRole === "owner" ? "\u{1F451} Owner" : "\u{1F6E1}\uFE0F Admin"}
          </span>
          {room.micPermission && room.micPermission !== "all" && (
            <span className="room-role-tag room-role-mic">
              {"\u{1F3A4}"} Mic: {room.micPermission === "request" ? "Request" : "Admin Only"}
            </span>
          )}
          {room.isPrivate && (
            <span className="room-role-tag room-role-private">{"\u{1F512}"} Private</span>
          )}
        </div>
      )}
    </>
  );
}

const iconBtn: React.CSSProperties = {
  width: 30, height: 30, borderRadius: 15,
  background: "transparent", border: "none",
  color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
  cursor: "pointer", fontFamily: "inherit", fontSize: 13, padding: 0,
};

const divider: React.CSSProperties = {
  width: 1, height: 16, background: "rgba(255,215,0,0.25)",
};
