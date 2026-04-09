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
  officialUids?: Set<string>;
}

export default function SeatGrid({ room, userUid, hasControl, speakingUids, voiceJoined, hashCode, onSeatTap, isOwnerSeat, officialUids }: SeatGridProps) {
  return (
    <div className="room-seat-area">
      <div className="room-seat-grid">
        {Array.from({ length: 12 }, (_, i) => {
          const lockedByDefault = [3, 7, 10, 11].includes(i);
          const seat = room.seats[i] || { index: i, userId: null, username: null, avatar: null, isMuted: false, isLocked: lockedByDefault, isSpeaking: false };
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
              isOfficial={seat.userId ? (officialUids?.has(seat.userId) || false) : false}
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
  isOfficial: boolean;
  onTap: () => void;
}

function AudioWaveRing() {
  return (
    <svg className="audio-wave-svg" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
      {[0, 1, 2].map(i => (
        <circle
          key={i}
          cx="40" cy="40"
          r={30 + i * 5}
          fill="none"
          stroke="rgba(0,255,255,0.6)"
          strokeWidth={2 - i * 0.5}
          className={`audio-wave-ring audio-wave-ring-${i}`}
        />
      ))}
      {Array.from({ length: 12 }, (_, i) => {
        const angle = (i * 30) * (Math.PI / 180);
        const r = 28;
        const x = 40 + Math.cos(angle) * r;
        const y = 40 + Math.sin(angle) * r;
        return (
          <line
            key={`bar-${i}`}
            x1={x} y1={y}
            x2={40 + Math.cos(angle) * (r + 8)} y2={40 + Math.sin(angle) * (r + 8)}
            stroke="rgba(0,255,255,0.7)"
            strokeWidth="1.5"
            strokeLinecap="round"
            className={`audio-bar audio-bar-${i % 4}`}
          />
        );
      })}
    </svg>
  );
}

function SeatCell({ seat, seatIndex, role, isMe, isSpeaking, isOwner, isOfficial, onTap }: SeatCellProps) {
  const isActive = !!seat.userId;
  const isLocked = seat.isLocked;

  const seatClass = [
    "seat-bubble",
    isSpeaking ? "seat-speaking" : isActive ? "seat-active" : "seat-empty",
    isOwner && isActive ? "seat-owner" : "",
    isLocked ? "seat-locked" : "",
    isOfficial && isActive ? "seat-official" : "",
  ].filter(Boolean).join(" ");

  const clickable = (!isMe && seat.userId) || (!seat.userId && !isLocked);

  return (
    <div className="seat-cell" style={{ cursor: clickable ? "pointer" : "default" }} onClick={onTap}>
      <div className="seat-wrapper">
        {isOfficial && isActive && (
          <img src={`${import.meta.env.BASE_URL}assets/official/official_frame_new.svg`} alt="" className="official-phoenix-frame" />
        )}
        {isSpeaking && <AudioWaveRing />}
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
        {isOfficial && isActive && (
          <img src={`${import.meta.env.BASE_URL}assets/official/official_badge_new.svg`} alt="Official" className="official-badge-label" />
        )}
        {role === "owner" && isActive && !isOfficial && (
          <div className="seat-badge seat-badge-owner">{"\u{1F451}"}</div>
        )}
        {role === "admin" && isActive && !isOfficial && (
          <div className="seat-badge seat-badge-admin">{"\u{1F6E1}\uFE0F"}</div>
        )}
        {seat.isCoHost && role !== "owner" && role !== "admin" && isActive && !isOfficial && (
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
          <span className={`seat-name${isOfficial ? " seat-name-official" : ""}`}>{cleanName(seat.username)}</span>
        )}
        <span className="seat-number">{seatIndex + 1}</span>
      </div>
    </div>
  );
}
