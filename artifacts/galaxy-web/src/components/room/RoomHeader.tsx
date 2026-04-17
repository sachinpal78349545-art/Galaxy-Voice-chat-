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

  const pillBtn: React.CSSProperties = {
    width: 32, height: 32, borderRadius: 16,
    background: "rgba(0,0,0,0.45)", border: "1px solid rgba(255,255,255,0.12)",
    color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", fontFamily: "inherit", fontSize: 14, padding: 0,
    backdropFilter: "blur(8px)",
  };

  return (
    <>
      <div style={{
        position: "relative", zIndex: 5, padding: "44px 12px 8px",
        display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8,
      }}>
        {/* LEFT: avatar + name + ID + trophy badge */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            background: "rgba(0,0,0,0.4)", borderRadius: 28,
            padding: "5px 14px 5px 5px", maxWidth: "fit-content",
            border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(8px)",
          }} onClick={onOpenControlPanel}>
            <div style={{
              width: 38, height: 38, borderRadius: 19, overflow: "hidden",
              background: "rgba(108,92,231,0.2)", border: "1.5px solid rgba(255,255,255,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0,
            }}>
              {avatarContent.startsWith?.("http")
                ? <img src={room.roomAvatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : avatarContent}
            </div>
            <div style={{ minWidth: 0 }}>
              <h2 style={{
                fontSize: 14, fontWeight: 800, color: "#fff",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 140,
              }}>{room.name}</h2>
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 1 }}>
                <span style={{ fontSize: 9, color: "rgba(255,255,255,0.55)" }}>ID:{room.id.slice(5, 14)}</span>
                <span style={{ fontSize: 11 }}>{"\u{1F381}"}</span>
              </div>
            </div>
          </div>

          {/* Trophy / leaderboard badge */}
          <button onClick={onLoadLeaderboard} style={{
            marginTop: 6, marginLeft: 4,
            display: "inline-flex", alignItems: "center", gap: 5,
            background: "linear-gradient(90deg, rgba(0,0,0,0.5), rgba(0,0,0,0.3))",
            border: "1px solid rgba(255,215,0,0.35)",
            borderRadius: 14, padding: "3px 10px 3px 6px",
            cursor: "pointer", fontFamily: "inherit", color: "#FFD700",
            fontSize: 11, fontWeight: 800,
            backdropFilter: "blur(8px)",
          }}>
            <span style={{ fontSize: 13 }}>{"\u{1F3C6}"}</span>
            <span>{lbValue}K</span>
            <span style={{ fontSize: 10, color: "rgba(255,215,0,0.6)" }}>{"\u203A"}</span>
          </button>
        </div>

        {/* RIGHT: action buttons + viewer count */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button style={pillBtn} onClick={onShare} title="Share">{"\u2197"}</button>
            <button style={pillBtn} onClick={onOpenControlPanel} title="More">{"\u22EF"}</button>
            <button style={{
              ...pillBtn, background: "rgba(0,0,0,0.55)", color: "#fff",
            }} onClick={onShowCloseMenu} title="Close">{"\u2715"}</button>
          </div>

          {/* Viewer avatars + count */}
          <button onClick={onShowUsersPanel} style={{
            display: "flex", alignItems: "center", gap: 4,
            background: "rgba(0,0,0,0.45)", border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 18, padding: "2px 8px 2px 2px",
            cursor: "pointer", fontFamily: "inherit",
            backdropFilter: "blur(8px)",
          }}>
            {previewUsers[0] ? (
              <div style={{
                width: 24, height: 24, borderRadius: 12, overflow: "hidden",
                background: "rgba(108,92,231,0.2)", border: "1px solid rgba(255,255,255,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13,
              }}>
                {previewUsers[0].avatar?.startsWith?.("http")
                  ? <img src={previewUsers[0].avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : (previewUsers[0].avatar || "\u{1F464}")}
              </div>
            ) : (
              <div style={{
                width: 24, height: 24, borderRadius: 12,
                background: "rgba(108,92,231,0.2)", border: "1px solid rgba(255,255,255,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12,
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
