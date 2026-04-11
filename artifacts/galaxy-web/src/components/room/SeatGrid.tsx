import React from "react";
import { Room, RoomSeat, cleanName } from "./types";
import { getUserRole } from "../../lib/roomService";
import { isPngFrame, getPngFramePath, DEFAULT_FRAME_ID, isAnimatedFrame, getFrameColors } from "../../lib/storeService";

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
  superAdminUids?: Set<string>;
  equippedFrames?: Record<string, string>;
  ghostUids?: Set<string>;
}

export default function SeatGrid({ room, userUid, hasControl, speakingUids, voiceJoined, hashCode, onSeatTap, isOwnerSeat, officialUids, superAdminUids, equippedFrames, ghostUids }: SeatGridProps) {
  return (
    <div className="room-seat-area">
      <div className="room-seat-grid-8" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, padding: "6px 0", justifyItems: "center" }}>
        {Array.from({ length: 8 }, (_, i) => {
          const lockedByDefault = [7].includes(i);
          const seat = room.seats[i] || { index: i, userId: null, username: null, avatar: null, isMuted: false, isLocked: lockedByDefault, isSpeaking: false };
          const isSpeaking = seat.userId
            ? (voiceJoined ? speakingUids.has(Math.abs(hashCode(seat.userId)) % 1000000) : speakingUids.has(i))
            : false;
          const frameId = seat.userId && equippedFrames ? equippedFrames[seat.userId] : undefined;
          const isGhost = seat.userId ? (ghostUids?.has(seat.userId) || false) : false;
          const isGhostMe = isGhost && seat.userId === userUid;
          return (
            <div key={i} style={{ opacity: isGhost && !isGhostMe ? 0 : isGhostMe ? 0.4 : 1, transition: "opacity 0.3s" }}>
            <SeatCell
              seat={isGhost && !isGhostMe ? { ...seat, userId: null, username: null, avatar: null } : seat}
              seatIndex={i}
              role={seat.userId ? getUserRole(room, seat.userId) : "user"}
              isMe={seat.userId === userUid}
              isSpeaking={isGhost ? false : isSpeaking}
              isOwner={isOwnerSeat ? isOwnerSeat(seat) : false}
              isOfficial={seat.userId ? (officialUids?.has(seat.userId) || false) : false}
              isSuperAdmin={seat.userId ? (superAdminUids?.has(seat.userId) || false) : false}
              frameId={frameId}
              onTap={() => onSeatTap(i, seat)}
            />
            </div>
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
  isSuperAdmin: boolean;
  frameId?: string;
  onTap: () => void;
}

function AudioWaveRing({ color = "cyan" }: { color?: "cyan" | "gold" | "blue" }) {
  const colors = {
    cyan:  { ring: "rgba(0,255,255,0.6)", bar: "rgba(0,255,255,0.7)" },
    gold:  { ring: "rgba(255,215,0,0.6)", bar: "rgba(255,215,0,0.7)" },
    blue:  { ring: "rgba(0,206,201,0.6)", bar: "rgba(9,132,227,0.7)" },
  };
  const c = colors[color];
  return (
    <svg className="audio-wave-svg" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
      {[0, 1, 2].map(i => (
        <circle
          key={i}
          cx="40" cy="40"
          r={30 + i * 5}
          fill="none"
          stroke={c.ring}
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
            stroke={c.bar}
            strokeWidth="1.5"
            strokeLinecap="round"
            className={`audio-bar audio-bar-${i % 4}`}
          />
        );
      })}
    </svg>
  );
}

function SeatCell({ seat, seatIndex, role, isMe, isSpeaking, isOwner, isOfficial, isSuperAdmin, frameId, onTap }: SeatCellProps) {
  const isActive = !!seat.userId;
  const isLocked = seat.isLocked;
  const isSpecial = isOfficial || isSuperAdmin;
  const activeFrameId = isSuperAdmin ? undefined : (frameId || (isActive ? DEFAULT_FRAME_ID : undefined));
  const hasPngFrame = activeFrameId && isPngFrame(activeFrameId);
  const hasAnimFrame = activeFrameId && isAnimatedFrame(activeFrameId);
  const animColors = hasAnimFrame ? getFrameColors(activeFrameId!) : null;

  const seatClass = [
    "seat-bubble",
    isSuperAdmin && isActive ? "" : (hasAnimFrame ? "" : (hasPngFrame ? "" : (isSpeaking ? "seat-speaking" : isActive ? "seat-active" : "seat-empty"))),
    isOwner && isActive && !hasPngFrame && !hasAnimFrame && !isSuperAdmin ? "seat-owner" : "",
    isLocked ? "seat-locked" : "",
    !hasPngFrame && !hasAnimFrame && !isSuperAdmin && isOfficial && isActive ? "seat-official" : "",
  ].filter(Boolean).join(" ");

  const clickable = (!isMe && seat.userId) || (!seat.userId && !isLocked);
  const pngPath = hasPngFrame ? getPngFramePath(activeFrameId!) : null;

  return (
    <div className="seat-cell" style={{ cursor: clickable ? "pointer" : "default" }} onClick={onTap}>
      <div className="seat-wrapper">
        {isSuperAdmin && isActive && (
          <>
            <div className="sa-seat-ring" style={{ width: 66, height: 66, transform: "translate(-50%, -50%)" }}>
              <div style={{ width: 54, height: 54, borderRadius: "50%", background: "#1A0F2E" }} />
            </div>
            <div className="sa-seat-crown">{"\u{1F451}"}</div>
          </>
        )}
        {!isSuperAdmin && !hasPngFrame && !hasAnimFrame && isOfficial && isActive && (
          <img src={`${import.meta.env.BASE_URL}assets/official/official_frame_new.png`} alt="" className="official-phoenix-frame" />
        )}
        {pngPath && isActive && (
          <img
            src={pngPath}
            alt=""
            className="png-frame-seat"
          />
        )}
        {hasAnimFrame && animColors && isActive && (
          <div className="af-seat-wrapper">
            <div
              className={`af-wrapper af-${activeFrameId!.replace("frame_", "")}`}
              style={{ width: 66, height: 66 }}
            >
              <div
                className="af-ring"
                style={{
                  background: `conic-gradient(${animColors.primary}, ${animColors.secondary}, ${animColors.tertiary}, ${animColors.primary})`,
                }}
              />
              <div className="af-glow" style={{
                boxShadow: `0 0 8px ${animColors.primary}99, 0 0 16px ${animColors.secondary}66`,
              }} />
            </div>
          </div>
        )}
        {isSpeaking && <AudioWaveRing color={isSuperAdmin ? "gold" : isOfficial ? "blue" : "cyan"} />}
        {isSpeaking && (
          <div className={isSuperAdmin ? "speaking-ring-gold" : isOfficial ? "speaking-ring-blue" : ""}>
            <div className="speaking-ring speaking-ring-inner" />
            <div className="speaking-ring speaking-ring-outer" />
          </div>
        )}
        <div className={seatClass}>
          {isLocked ? (
            <span className="seat-locked-icon">{"\u{1F512}"}</span>
          ) : isActive ? (
            seat.avatar?.startsWith("http")
              ? <img src={seat.avatar} alt="" className="seat-avatar-img" onError={e => { (e.target as HTMLImageElement).style.display = "none"; (e.target as HTMLImageElement).parentElement!.innerHTML = '<span>\u{1F464}</span>'; }} />
              : <span>{seat.avatar && seat.avatar.length <= 4 ? seat.avatar : "\u{1F464}"}</span>
          ) : (
            <span className="seat-empty-plus">+</span>
          )}
        </div>
        {isSuperAdmin && isActive && (
          <img src={`${import.meta.env.BASE_URL}assets/official/super_admin_badge.svg`} alt="Super Admin" className="super-admin-seat-badge" />
        )}
        {isOfficial && !isSuperAdmin && isActive && (
          <img src={`${import.meta.env.BASE_URL}assets/official/official_badge_new.png`} alt="Official" className="official-badge-label" />
        )}
        {role === "owner" && isActive && !isSpecial && (
          <div className="seat-badge seat-badge-owner">{"\u{1F451}"}</div>
        )}
        {role === "admin" && isActive && !isSpecial && (
          <div className="seat-badge seat-badge-admin">{"\u{1F6E1}\uFE0F"}</div>
        )}
        {seat.isCoHost && role !== "owner" && role !== "admin" && isActive && !isSpecial && (
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
          <span className={`seat-name${isSuperAdmin ? " seat-name-super-admin" : isOfficial ? " seat-name-official" : ""}`}>{cleanName(seat.username)}</span>
        )}
        <span className="seat-number">{seatIndex + 1}</span>
      </div>
    </div>
  );
}
