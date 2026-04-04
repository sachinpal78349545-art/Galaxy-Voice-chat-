import { useEffect, useState } from "react";
// Imports ko exact file name (Capital 'S') ke sath match kiya gaya hai
import { listenNotifications, markAsRead } from "../lib/notificationSystem";
import { followUser } from "../lib/followSystem";
import { useApp } from "../lib/context";

export default function NotificationsPage() {
  const { currentUser } = useApp();
  const [list, setList] = useState<any[]>([]);

  useEffect(() => {
    if (!currentUser) return;
    // Cleanup function ke sath listener setup
    const unsubscribe = listenNotifications(currentUser.uid, setList);
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [currentUser]);

  if (!currentUser) return <div style={{ padding: 20 }}>Loading...</div>;

  return (
    <div style={{ padding: 16, color: "white" }}>
      <h2 style={{ marginBottom: 20 }}>🔔 Notifications</h2>

      {list.length === 0 && <p style={{ opacity: 0.6 }}>No notifications yet.</p>}

      {list.map((n: any) => (
        <div key={n.id} style={{
          padding: 12,
          borderBottom: "1px solid #333",
          background: n.read ? "transparent" : "rgba(255,255,255,0.05)",
          marginBottom: 8,
          borderRadius: 12,
          transition: "0.3s"
        }}>
          <p style={{ margin: "0 0 10px 0" }}>
            <span style={{ fontWeight: "bold", color: "#4da6ff" }}>{n.fromName || n.from}</span> {n.text}
          </p>

          <div style={{ display: "flex", gap: "10px" }}>
            {/* FOLLOW BACK */}
            {n.type === "follow" && (
              <button
                onClick={() => followUser(currentUser.uid, n.fromId || n.from)}
                style={{ 
                  padding: "6px 12px", 
                  borderRadius: "6px", 
                  background: "#007bff", 
                  color: "white", 
                  border: "none",
                  cursor: "pointer"
                }}
              >
                Follow Back
              </button>
            )}

            {/* MARK READ */}
            {!n.read && (
              <button 
                onClick={() => markAsRead(currentUser.uid, n.id)}
                style={{ 
                  padding: "6px 12px", 
                  borderRadius: "6px", 
                  background: "#444", 
                  color: "white", 
                  border: "none",
                  cursor: "pointer"
                }}
              >
                Mark Read
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
