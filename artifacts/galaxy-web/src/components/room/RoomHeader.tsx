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
  room, myRole, liveCount, elapsed, hasControl,
  onOpenControlPanel, onShowUsersPanel, onShowCloseMenu, onLoadLeaderboard, onShare,
}: RoomHeaderProps) {
  const avatarContent = (room.roomAvatar || room.coverEmoji || "\u{1F3A4}");

  return (
    <>
      <div className="room-header">
        <div className="room-header-row">
          <div className="room-header-avatar" onClick={onOpenControlPanel}>
            {avatarContent.startsWith?.("http")
              ? <img src={room.roomAvatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 18 }} />
              : avatarContent}
          </div>
          <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={onOpenControlPanel}>
            <h2 className="room-header-title">{room.name}</h2>
          </div>
          <div className="room-header-actions">
            <button className="room-header-btn" onClick={onShare}>{"\u{1F517}"}</button>
            <button className="room-header-btn" onClick={onShowUsersPanel}>{"\u{1F465}"}</button>
            <button className="room-header-btn" onClick={onOpenControlPanel}>{"\u2630"}</button>
            <button className="room-header-btn room-header-btn-danger" onClick={onShowCloseMenu}>{"\u2715"}</button>
          </div>
        </div>
        <div className="room-header-meta">
          <span className="room-header-live-badge">
            <span className="room-header-live-dot" /> LIVE
          </span>
          <span className="room-header-stat">{liveCount} online</span>
          <span className="room-header-stat" style={{ color: "rgba(255,255,255,0.4)" }}>{"\u23F1"} {elapsed}</span>
          <span className="room-header-id">ID: {room.id.slice(5, 13)}</span>
          <button className="room-header-lb-btn" onClick={onLoadLeaderboard}>
            {"\u{1F3C6}"} {(liveCount * 0.95 + 0.28).toFixed(2)}K
          </button>
        </div>
      </div>

      {myRole !== "user" && (
        <div className="room-role-bar">
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
