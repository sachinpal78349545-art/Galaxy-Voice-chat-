/**
 * AvatarFrame – unified avatar + animated frame component
 * Used in: SeatGrid, ProfilePage, ChatMessages, StorePage preview
 *
 * Frame types handled:
 *   • CSS animated (FRAME_COLORS) – spinning conic ring (.af-wrapper system)
 *   • SVG frames (frame_divine_wing, frame_crystal_pink) – layered SVG overlay
 *   • No frame – plain circular avatar with optional neon glow
 */
import React from "react";
import { isAnimatedFrame, getFrameColors, isPngFrame } from "../../lib/storeService";
import DivineWingFrame from "./DivineWingFrame";
import CrystalPinkFrame from "./CrystalPinkFrame";

export interface AvatarFrameProps {
  avatar: string;
  frameId?: string;
  size?: number;
  onClick?: () => void;
  className?: string;
  glow?: boolean;
}

export default function AvatarFrame({
  avatar,
  frameId,
  size = 56,
  onClick,
  className = "",
  glow = false,
}: AvatarFrameProps) {
  const hasCssFrame  = !!frameId && isAnimatedFrame(frameId);
  const hasSvgFrame  = !!frameId && isPngFrame(frameId);
  const colors       = hasCssFrame ? getFrameColors(frameId!) : null;
  const wrapperSize  = size + 12;

  const avatarEl = (
    <AvatarImg avatar={avatar} size={size} glow={glow} />
  );

  /* ── CSS animated ring frame ── */
  if (hasCssFrame && colors) {
    return (
      <div
        className={`af-wrapper af-${frameId!.replace("frame_", "")} ${className}`}
        style={{ width: wrapperSize, height: wrapperSize, cursor: onClick ? "pointer" : "default", flexShrink: 0 }}
        onClick={onClick}
      >
        <div
          className="af-ring"
          style={{ background: `conic-gradient(${colors.primary}, ${colors.secondary}, ${colors.tertiary}, ${colors.primary})` }}
        />
        <div className="af-glow" style={{ boxShadow: `0 0 12px ${colors.primary}99, 0 0 24px ${colors.secondary}66, 0 0 36px ${colors.tertiary}44` }} />
        <AvatarImgInner avatar={avatar} />
        <FrameOverlayVfx frameId={frameId!} />
      </div>
    );
  }

  /* ── SVG overlay frame (Divine Wing, Crystal Pink) ── */
  if (hasSvgFrame) {
    const SvgFrame = frameId === "frame_divine_wing" ? DivineWingFrame : CrystalPinkFrame;
    return (
      <div
        className={className}
        style={{ position: "relative", width: wrapperSize, height: wrapperSize, flexShrink: 0, cursor: onClick ? "pointer" : "default" }}
        onClick={onClick}
      >
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {avatarEl}
        </div>
        <SvgFrame size={wrapperSize} style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />
      </div>
    );
  }

  /* ── No frame ── */
  return (
    <div
      className={className}
      style={{ position: "relative", width: size, height: size, flexShrink: 0, cursor: onClick ? "pointer" : "default" }}
      onClick={onClick}
    >
      {avatarEl}
    </div>
  );
}

/* ── Plain avatar img ── */
function AvatarImg({ avatar, size, glow }: { avatar: string; size: number; glow: boolean }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", overflow: "hidden",
      background: "rgba(108,92,231,0.3)",
      boxShadow: glow ? "0 0 12px rgba(108,92,231,0.6), 0 0 24px rgba(108,92,231,0.3)" : "none",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0,
    }}>
      {avatar && (avatar.startsWith("http") || avatar.startsWith("/")) ? (
        <img src={avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }}
          onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
      ) : (
        <span style={{ fontSize: size * 0.4 }}>{avatar && avatar.length <= 4 ? avatar : "👤"}</span>
      )}
    </div>
  );
}

/* ── For use inside af-wrapper (uses .af-img class) ── */
function AvatarImgInner({ avatar }: { avatar: string }) {
  return avatar && (avatar.startsWith("http") || avatar.startsWith("/")) ? (
    <img src={avatar} alt="" className="af-img"
      onError={e => {
        const img = e.target as HTMLImageElement;
        img.style.display = "none";
        if (img.parentElement) img.parentElement.textContent = "👤";
      }}
    />
  ) : (
    <div className="af-img af-img-placeholder">{avatar && avatar.length <= 4 ? avatar : "👤"}</div>
  );
}

/* ── VFX overlay per frame type ── */
function FrameOverlayVfx({ frameId }: { frameId: string }) {
  const id = frameId.replace("frame_", "");
  if (id === "golden_crown") return <div className="af-overlay af-particles af-particles-gold" />;
  if (id === "fire")         return <div className="af-overlay af-particles af-particles-fire" />;
  if (id === "angel_wings")  return <><div className="af-wing af-wing-left" /><div className="af-wing af-wing-right" /></>;
  if (id === "dark_aura")    return <div className="af-overlay af-smoke" />;
  if (id === "pink_love")    return <div className="af-overlay af-particles af-particles-hearts" />;
  if (id === "electric")     return <div className="af-overlay af-electric-arcs" />;
  if (id === "galaxy")       return <div className="af-overlay af-stars" />;
  if (id === "diamond_royal") return <div className="af-overlay af-shimmer" />;
  return null;
}
