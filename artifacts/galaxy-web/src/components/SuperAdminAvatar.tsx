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

  return (
    <div className="sa-avatar-wrapper" style={{ width: size, height: size }} onClick={onClick}>
      <div className="sa-ring" />
      {src.startsWith("http") ? (
        <img src={src} alt="" className="sa-avatar-img" />
      ) : (
        <div className="sa-avatar-img" style={{ display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.35, background: "linear-gradient(135deg, rgba(108,92,231,0.25), rgba(108,92,231,0.1))" }}>{src}</div>
      )}
      <div className="sa-crown">{"\u{1F451}"}</div>
    </div>
  );
}
