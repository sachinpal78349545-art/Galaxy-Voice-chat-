import React from "react";
import { SUPER_ADMIN_USER_ID } from "../lib/userService";

interface SuperAdminAvatarProps {
  src: string;
  userId: string;
  size?: number;
  onClick?: () => void;
}

export default function SuperAdminAvatar({ src, userId, size = 90, onClick }: SuperAdminAvatarProps) {
  if (userId !== SUPER_ADMIN_USER_ID) {
    return (
      <div style={{ width: size, height: size, borderRadius: "50%", overflow: "hidden", cursor: onClick ? "pointer" : "default" }} onClick={onClick}>
        {src.startsWith("http") ? (
          <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.5, background: "linear-gradient(135deg, rgba(108,92,231,0.25), rgba(108,92,231,0.1))" }}>{src}</div>
        )}
      </div>
    );
  }

  const borderWidth = Math.max(3, size * 0.04);
  const outerSize = size + borderWidth * 2 + 4;

  return (
    <div className="sa-avatar-container" style={{ width: outerSize, height: outerSize }} onClick={onClick}>
      <div className="sa-crown">{"\u{1F451}"}</div>
      <div className="sa-ring" style={{ width: outerSize, height: outerSize }}>
        <div className="sa-ring-inner" style={{ width: size, height: size }}>
          {src.startsWith("http") ? (
            <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.5, background: "linear-gradient(135deg, rgba(108,92,231,0.25), rgba(108,92,231,0.1))", borderRadius: "50%" }}>{src}</div>
          )}
        </div>
      </div>
      <div className="sa-label">SUPER ADMIN</div>
    </div>
  );
}
