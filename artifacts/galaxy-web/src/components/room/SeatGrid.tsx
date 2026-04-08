import React from "react";
import { Room, RoomSeat, cleanName } from "./types";
import { getUserRole } from "../../lib/roomService";

interface SeatGridProps {
  room: Room;
  userUid: string;
  hasControl: boolean;
  speakingUids: Set<number>;
  voiceJoined: boolean;
  hashCode: (s: string) => number;
  onSeatTap: (seatIndex: number, seat: RoomSeat) => void;
  isOwnerSeat?: (seat: RoomSeat) => boolean;
}

export default function SeatGrid({ room, userUid, hasControl, speakingUids, voiceJoined, hashCode, onSeatTap, isOwnerSeat }: SeatGridProps) {
  return (
    <div className="room-seat-area">
      <div className="room-seat-grid">
        {Array.from({ length: 12 }, (_, i) => {
          const seat = room.seats[i] || { index: i, userId: null, username: null, avatar: null, isMuted: false, isLocked: true, isSpeaking: false };
          const isSpeaking = seat.userId
            ? (voiceJoined ? speakingUids.has(Math.abs(hashCode(seat.userId)) % 1000000) : seat.isSpeaking)
            : false;
          return (
            <SeatCell
              key={i}
              seat={seat}
              seatIndex={i}
              role={seat.userId ? getUserRole(room, seat.userId) : "user"}
              isMe={seat.userId === userUid}
              isSpeaking={isSpeaking}
              isOwner={isOwnerSeat ? isOwnerSeat(seat) : false}
              onTap={() => onSeatTap(i, seat)}
            />
          );
        })}
      </div>
    </div>
  );
}

interface SeatCellProps {
  seat: RoomSeat;
  seatIndex: number;
  role: "owner" | "admin" | "user";
  isMe: boolean;
  isSpeaking: boolean;
  isOwner: boolean;
  onTap: () => void;
}

function SeatCell({ seat, seatIndex, role, isMe, isSpeaking, isOwner, onTap }: SeatCellProps) {
  const isActive = !!seat.userId;
  const isLocked = seat.isLocked;

  const seatClass = [
    "seat-bubble",
    isSpeaking ? "seat-speaking" : isOwner ? "seat-owner" : isActive ? "seat-active" : "seat-empty",
    isLocked ? "seat-locked" : "",
  ].filter(Boolean).join(" ");

  const clickable = (!isMe && seat.userId) || (!seat.userId && !isLocked);

  return (
    <div className="seat-cell" style={{ cursor: clickable ? "pointer" : "default" }} onClick={onTap}>
      <div className="seat-wrapper">
        {isSpeaking && (
          <>
            <div className="speaking-ring speaking-ring-inner" />
            <div className="speaking-ring speaking-ring-outer" />
          </>
        )}
        <div className={seatClass}>
          {isLocked ? (
            <span className="seat-locked-icon">{"\u{1F512}"}</span>
          ) : isActive ? (
            seat.avatar?.startsWith("http")
              ? <img src={seat.avatar} alt="" className="seat-avatar-img" />
              : <span>{seat.avatar}</span>
          ) : (
            <span className="seat-empty-plus">+</span>
          )}
        </div>
        {role === "owner" && isActive && (
          <div className="seat-badge seat-badge-owner">{"\u{1F451}"}</div>
        )}
        {role === "admin" && isActive && (
          <div className="seat-badge seat-badge-admin">{"\u{1F6E1}\uFE0F"}</div>
        )}
        {seat.isCoHost && role !== "owner" && role !== "admin" && isActive && (
          <div className="seat-badge seat-badge-cohost">{"\u{1F396}\uFE0F"}</div>
        )}
        {isActive && seat.isMuted && (
          <div className="seat-muted-indicator">{"\u{1F507}"}</div>
        )}
        {seat.handRaised && (
          <div className="seat-hand-raised">{"\u270B"}</div>
        )}
      </div>
      <div className="seat-info">
        {isActive && seat.username && (
          <span className="seat-name">{cleanName(seat.username)}</span>
        )}
        <span className="seat-number">{seatIndex + 1}</span>
      </div>
    </div>
  );
}
