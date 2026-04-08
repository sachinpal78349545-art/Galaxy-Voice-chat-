import React from "react";
import { Room, cleanName } from "./types";

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
  room, myRole, liveCount, elapsed, hasControl,
  onOpenControlPanel, onShowUsersPanel, onShowCloseMenu, onLoadLeaderboard, onShare,
}: RoomHeaderProps) {
  return (
    <>
      <div className="room-header">
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <div onClick={onOpenControlPanel}
            style={{
              width: 36, height: 36, borderRadius: 18, fontSize: 20,
              background: "transparent", border: "1.5px solid rgba(255,255,255,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", flexShrink: 0, overflow: "hidden",
            }}>
            {(room.roomAvatar || room.coverEmoji || "\u{1F3A4}").startsWith?.("http")
              ? <img src={room.roomAvatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 18 }} />
              : (room.roomAvatar || room.coverEmoji || "\u{1F3A4}")}
          </div>
          <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={onOpenControlPanel}>
            <h2 style={{ fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#fff", margin: 0, lineHeight: 1.3 }}>{room.name}</h2>
          </div>
          <div style={{ display: "flex", gap: 2, flexShrink: 0, alignItems: "center" }}>
            <HeaderBtn onClick={onShare}>{"\u{1F517}"}</HeaderBtn>
            <HeaderBtn onClick={onShowUsersPanel}>{"\u{1F465}"}</HeaderBtn>
            <HeaderBtn onClick={onOpenControlPanel}>{"\u2630"}</HeaderBtn>
            <HeaderBtn onClick={onShowCloseMenu} danger>{"\u2715"}</HeaderBtn>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: 44 }}>
          <span style={{ fontSize: 8, padding: "1px 5px", borderRadius: 6, background: "transparent", border: "1px solid rgba(45,212,191,0.3)", color: "#2DD4BF", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 3 }}>
            <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#2DD4BF", animation: "crystalPulse 2s ease-in-out infinite" }} /> LIVE
          </span>
          <span style={{ fontSize: 8, color: "rgba(255,255,255,0.5)" }}>{liveCount} online</span>
          <span style={{ fontSize: 8, color: "rgba(255,255,255,0.4)" }}>{"\u23F1"} {elapsed}</span>
          <span style={{ fontSize: 8, color: "rgba(255,255,255,0.3)" }}>ID: {room.id.slice(5, 13)}</span>
          <button onClick={onLoadLeaderboard} style={{
            display: "inline-flex", alignItems: "center", gap: 2, padding: "1px 5px", borderRadius: 6,
            background: "transparent", border: "1px solid rgba(255,215,0,0.2)",
            cursor: "pointer", fontSize: 8, color: "#FFD700", fontWeight: 600, fontFamily: "inherit",
          }}>{"\u{1F3C6}"} {(liveCount * 0.95 + 0.28).toFixed(2)}K</button>
        </div>
      </div>

      {myRole !== "user" && (
        <div className="room-role-bar">
          <span style={{
            fontSize: 9, padding: "2px 8px", borderRadius: 10, fontWeight: 700,
            background: myRole === "owner" ? "rgba(255,215,0,0.1)" : "rgba(255,255,255,0.06)",
            border: myRole === "owner" ? "1px solid rgba(255,215,0,0.2)" : "1px solid rgba(255,255,255,0.1)",
            color: myRole === "owner" ? "#FFD700" : "rgba(255,255,255,0.6)",
          }}>
            {myRole === "owner" ? "\u{1F451} Owner" : "\u{1F6E1}\uFE0F Admin"}
          </span>
          {room.micPermission && room.micPermission !== "all" && (
            <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 10, fontWeight: 700, background: "rgba(45,212,191,0.08)", border: "1px solid rgba(45,212,191,0.2)", color: "#2DD4BF" }}>
              {"\u{1F3A4}"} Mic: {room.micPermission === "request" ? "Request" : "Admin Only"}
            </span>
          )}
          {room.isPrivate && <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 10, fontWeight: 700, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}>{"\u{1F512}"} Private</span>}
        </div>
      )}
    </>
  );
}

function HeaderBtn({ onClick, danger, children }: { onClick: () => void; danger?: boolean; children: React.ReactNode }) {
  return (
    <button style={{
      width: 26, height: 26, padding: 0, borderRadius: 13, fontSize: 12,
      border: "none", background: "transparent", cursor: "pointer",
      display: "flex", alignItems: "center", justifyContent: "center",
      color: danger ? "rgba(255,100,130,0.5)" : "rgba(255,255,255,0.45)",
    }} onClick={onClick}>{children}</button>
  );
}
