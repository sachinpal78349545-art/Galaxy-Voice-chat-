/**
 * AvatarFrame – unified avatar + frame component
 * Used in: SeatGrid, ProfilePage, ChatMessages, StorePage preview
 *
 * Frame types handled:
 *   • Dynamic frames (from Firebase appConfig/frames) – imageUrl overlay (transparent PNG, extends outside)
 *   • CSS animated (FRAME_COLORS) – spinning conic ring (.af-wrapper system)
 *   • SVG frames (frame_divine_wing, frame_crystal_pink) – layered SVG overlay
 *   • Official Host – automatic gold star border for globalRole === "official"
 *   • No frame – plain circular avatar with optional neon glow
 */
import React, { useState, useEffect } from "react";
import { isAnimatedFrame, getFrameColors, isPngFrame } from "../../lib/storeService";
import { ref as dbRef, get } from "firebase/database";
import { db } from "../../lib/firebase";
import DivineWingFrame from "./DivineWingFrame";
import CrystalPinkFrame from "./CrystalPinkFrame";

export interface AvatarFrameProps {
  avatar: string;
  frameId?: string;
  size?: number;
  onClick?: () => void;
  className?: string;
  glow?: boolean;
  /** Pass "official" to auto-show the Official Host golden frame */
  globalRole?: string;
}

export default function AvatarFrame({
  avatar,
  frameId,
  size = 56,
  onClick,
  className = "",
  glow = false,
  globalRole,
}: AvatarFrameProps) {
  const [dynamicFrameUrl, setDynamicFrameUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isOfficial = globalRole === "official";

  // ── Check frame type ──
  const hasCssFrame  = !!frameId && isAnimatedFrame(frameId);
  const hasSvgFrame  = !!frameId && isPngFrame(frameId);
  const colors       = hasCssFrame ? getFrameColors(frameId!) : null;
  const wrapperSize  = size + 12;
  const officialWrapperSize = size + 14;

  // ── Fetch dynamic frame from Firebase if not static ──
  useEffect(() => {
    if (!frameId || hasCssFrame || hasSvgFrame) {
      setDynamicFrameUrl(null);
      return;
    }
    setLoading(true);
    const frameRef = dbRef(db, `appConfig/frames/${frameId}`);
    get(frameRef)
      .then((snap) => {
        if (snap.exists()) {
          const data = snap.val();
          setDynamicFrameUrl(data.imageUrl || null);
        } else {
          setDynamicFrameUrl(null);
        }
        setLoading(false);
      })
      .catch(() => { setDynamicFrameUrl(null); setLoading(false); });
  }, [frameId, hasCssFrame, hasSvgFrame]);

  const isDynamicFrame = !!dynamicFrameUrl && !hasCssFrame && !hasSvgFrame;

  /* ── 0️⃣ Official Host frame (auto, no equip needed) ── */
  if (isOfficial && !hasCssFrame && !hasSvgFrame && !isDynamicFrame) {
    return (
      <div
        className={className}
        style={{ position: "relative", width: officialWrapperSize, height: officialWrapperSize, flexShrink: 0, cursor: onClick ? "pointer" : "default" }}
        onClick={onClick}
      >
        {/* Rotating gold star ring */}
        <div style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          background: "conic-gradient(#FFD700, #FFA500, #FF8C00, #FFD700, #FFF8C4, #FFD700)",
          animation: "afSpin 4s linear infinite",
          filter: "blur(3px)",
        }} />
        <div style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          boxShadow: "0 0 14px #FFD70099, 0 0 28px #FFA50066",
          animation: "afPulseGold 2s ease-in-out infinite",
        }} />
        {/* Avatar */}
        <div style={{
          position: "absolute", inset: 6, borderRadius: "50%", overflow: "hidden",
          background: "#0a0515",
        }}>
          <AvatarImgInner avatar={avatar} />
        </div>
        {/* HOST badge */}
        <div style={{
          position: "absolute", bottom: -2, left: "50%", transform: "translateX(-50%)",
          background: "linear-gradient(90deg, #FFD700, #FFA500)",
          color: "#1a0a00", fontSize: 8, fontWeight: 800,
          padding: "1px 6px", borderRadius: 999,
          letterSpacing: "0.05em", zIndex: 10, whiteSpace: "nowrap",
          boxShadow: "0 1px 4px #FFD70088",
        }}>HOST</div>
      </div>
    );
  }

  /* ── 1️⃣ CSS animated ring frame ── */
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
        {isOfficial && <OfficialHostBadge />}
      </div>
    );
  }

  /* ── 2️⃣ SVG overlay frame (Divine Wing, Crystal Pink) ── */
  if (hasSvgFrame) {
    const SvgFrame = frameId === "frame_divine_wing" ? DivineWingFrame : CrystalPinkFrame;
    return (
      <div
        className={className}
        style={{ position: "relative", width: wrapperSize, height: wrapperSize, flexShrink: 0, cursor: onClick ? "pointer" : "default" }}
        onClick={onClick}
      >
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <AvatarImg avatar={avatar} size={size} glow={glow} />
        </div>
        <SvgFrame size={wrapperSize} style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />
        {isOfficial && <OfficialHostBadge />}
      </div>
    );
  }

  /* ── 3️⃣ Dynamic frame (transparent PNG imageUrl from Firebase) ── */
  if (isDynamicFrame) {
    return (
      <div
        className={className}
        style={{
          position: "relative",
          width: wrapperSize,
          height: wrapperSize,
          flexShrink: 0,
          cursor: onClick ? "pointer" : "default",
        }}
        onClick={onClick}
      >
        {/* Avatar centered inside – clipped to circle */}
        <div style={{
          position: "absolute",
          top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: size, height: size,
          borderRadius: "50%",
          overflow: "hidden",
          boxShadow: glow ? `0 0 12px rgba(108,92,231,0.6), 0 0 24px rgba(108,92,231,0.3)` : "none",
        }}>
          <img
            src={avatar}
            alt="Avatar"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        </div>
        {/* Frame overlay – transparent PNG, extends to full wrapperSize */}
        {!loading && (
          <img
            src={dynamicFrameUrl!}
            alt="Frame"
            style={{
              position: "absolute",
              top: 0, left: 0,
              width: "100%", height: "100%",
              objectFit: "contain",
              pointerEvents: "none",
            }}
          />
        )}
        {loading && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#fff", fontSize: 10 }}>⏳</span>
          </div>
        )}
        {isOfficial && <OfficialHostBadge />}
      </div>
    );
  }

  /* ── 4️⃣ No frame (plain avatar) ── */
  return (
    <div
      className={className}
      style={{ position: "relative", width: isOfficial ? officialWrapperSize : size, height: isOfficial ? officialWrapperSize : size, flexShrink: 0, cursor: onClick ? "pointer" : "default" }}
      onClick={onClick}
    >
      {isOfficial ? (
        <>
          <div style={{
            position: "absolute", inset: 0, borderRadius: "50%",
            background: "conic-gradient(#FFD700, #FFA500, #FF8C00, #FFD700, #FFF8C4, #FFD700)",
            animation: "afSpin 4s linear infinite",
            filter: "blur(3px)",
          }} />
          <div style={{
            position: "absolute", inset: 0, borderRadius: "50%",
            boxShadow: "0 0 14px #FFD70099, 0 0 28px #FFA50066",
            animation: "afPulseGold 2s ease-in-out infinite",
          }} />
          <div style={{
            position: "absolute", inset: 6, borderRadius: "50%", overflow: "hidden", background: "#0a0515",
          }}>
            <AvatarImgInner avatar={avatar} />
          </div>
          <OfficialHostBadge />
        </>
      ) : (
        <AvatarImg avatar={avatar} size={size} glow={glow} />
      )}
    </div>
  );
}

/* ── Official HOST bottom badge ── */
function OfficialHostBadge() {
  return (
    <div style={{
      position: "absolute", bottom: -2, left: "50%", transform: "translateX(-50%)",
      background: "linear-gradient(90deg, #FFD700, #FFA500)",
      color: "#1a0a00", fontSize: 8, fontWeight: 800,
      padding: "1px 6px", borderRadius: 999,
      letterSpacing: "0.05em", zIndex: 10, whiteSpace: "nowrap",
      boxShadow: "0 1px 4px #FFD70088",
    }}>HOST</div>
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

/* ── FramePreview (no avatar, just animated ring for store/backpack) ── */
export function FramePreview({ frameId, size = 56 }: { frameId: string; size?: number }) {
  const hasCssFrame = isAnimatedFrame(frameId);
  const colors = hasCssFrame ? getFrameColors(frameId) : null;
  const wrapperSize = size + 12;

  if (hasCssFrame && colors) {
    return (
      <div
        className={`af-wrapper af-${frameId.replace("frame_", "")}`}
        style={{ width: wrapperSize, height: wrapperSize, flexShrink: 0 }}
      >
        <div className="af-ring" style={{ background: `conic-gradient(${colors.primary}, ${colors.secondary}, ${colors.tertiary}, ${colors.primary})` }} />
        <div className="af-glow" style={{ boxShadow: `0 0 12px ${colors.primary}99, 0 0 24px ${colors.secondary}66` }} />
        <div className="af-img" style={{ background: "rgba(108,92,231,0.15)" }} />
        <FrameOverlayVfx frameId={frameId} />
      </div>
    );
  }
  return (
    <div style={{ width: wrapperSize, height: wrapperSize, borderRadius: "50%", background: "rgba(108,92,231,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ fontSize: size * 0.4 }}>🖼️</span>
    </div>
  );
}
