import React, { useState } from "react";
import { UserProfile, searchUsers, followUser, unfollowUser, isBlocked, sendFriendRequest } from "../lib/userService";
import { sendNotification } from "../lib/notificationService";
import { useToast } from "../lib/toastContext";

interface Props { user: UserProfile; }

export default function SearchPage({ user }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const { showToast } = useToast();

  const handleSearch = async () => {
    const q = query.trim();
    if (q.length < 2) { showToast("Enter at least 2 characters", "info"); return; }
    setLoading(true);
    setSearched(true);
    try {
      const res = await searchUsers(q);
      setResults(res.filter(u => u.uid !== user.uid));
    } catch {
      showToast("Search failed", "error");
    }
    setLoading(false);
  };

  const handleFollow = async (target: UserProfile) => {
    try {
      const isFollowing = (user.followingList || []).includes(target.uid);
      if (isFollowing) {
        await unfollowUser(user.uid, target.uid);
        showToast(`Unfollowed ${target.name}`, "info");
      } else {
        const result = await followUser(user.uid, target.uid);
        if (result.isMutual) {
          await sendNotification(target.uid, {
            type: "follow_back", title: "Followed Back!",
            body: `${user.name} followed you back! You can now chat.`,
            icon: "\u{1F91D}", fromUid: user.uid, fromName: user.name,
          });
          showToast(`Mutual follow! You can now chat with ${target.name}`, "success");
        } else {
          await sendNotification(target.uid, {
            type: "follower", title: "New Follower",
            body: `${user.name} started following you`,
            icon: "\u{1F31F}", fromUid: user.uid, fromName: user.name,
          });
          showToast(`Following ${target.name}`, "success");
        }
      }
    } catch {
      showToast("Action failed", "error");
    }
  };

  const handleFriendRequest = async (target: UserProfile) => {
    try {
      await sendFriendRequest(user.uid, user.name, user.avatar, target.uid);
      await sendNotification(target.uid, {
        type: "friend_request", title: "Friend Request",
        body: `${user.name} sent you a friend request`,
        icon: "\u{1F91D}", fromUid: user.uid, fromName: user.name,
      });
      showToast("Friend request sent!", "success");
    } catch {
      showToast("Request failed", "error");
    }
  };

  return (
    <div className="page-scroll page-enter">
      <div style={{ padding: "52px 16px 16px" }}>
        <h2 style={{ fontSize: 20, fontWeight: 900, marginBottom: 4 }}>{"\u{1F50D}"} Search Users</h2>
        <p style={{ fontSize: 12, color: "rgba(162,155,254,0.45)", marginBottom: 16 }}>Find by username or 9-digit User ID</p>

        <div style={{ display: "flex", gap: 8 }}>
          <input
            className="input-field"
            placeholder="Name or User ID..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            style={{ flex: 1, borderRadius: 22, padding: "12px 18px" }}
          />
          <button onClick={handleSearch} disabled={loading} className="btn btn-primary" style={{ borderRadius: 22, padding: "12px 20px", fontWeight: 800 }}>
            {loading ? "..." : "\u{1F50D}"}
          </button>
        </div>
      </div>

      {selectedUser ? (
        <div className="page-enter" style={{ padding: "0 16px" }}>
          <button onClick={() => setSelectedUser(null)} style={{
            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 14, padding: "6px 14px", cursor: "pointer", color: "#A29BFE", fontSize: 12, fontWeight: 700, fontFamily: "inherit", marginBottom: 12,
          }}>{"\u2039"} Back to results</button>
          <div className="card card-glow" style={{ padding: 24, textAlign: "center" }}>
            <div style={{
              width: 80, height: 80, borderRadius: 40, fontSize: 40, margin: "0 auto 12px",
              background: "linear-gradient(135deg, rgba(108,92,231,0.25), rgba(108,92,231,0.1))",
              border: "3px solid rgba(108,92,231,0.5)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 24px rgba(108,92,231,0.3)",
            }}>
              {selectedUser.avatar?.startsWith("http") ? (
                <img src={selectedUser.avatar} alt="" style={{ width: "100%", height: "100%", borderRadius: 40, objectFit: "cover" }} />
              ) : selectedUser.avatar}
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 900 }}>{selectedUser.name}</h3>
            {selectedUser.vip && <span className="badge badge-vip" style={{ margin: "4px 0" }}>{"\u{1F451}"} VIP</span>}
            <p style={{ fontSize: 12, color: "rgba(162,155,254,0.4)", fontFamily: "monospace", margin: "4px 0" }}>
              ID: {selectedUser.userId || "N/A"}
            </p>
            <p style={{ fontSize: 13, color: "rgba(162,155,254,0.6)", margin: "8px 0 16px", lineHeight: 1.5 }}>
              {selectedUser.bio || "No bio yet"}
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 24, marginBottom: 16 }}>
              {[
                { label: "Followers", val: (selectedUser.followers || 0).toLocaleString() },
                { label: "Following", val: (selectedUser.following || 0).toLocaleString() },
                { label: "Level", val: selectedUser.level || 1 },
              ].map(s => (
                <div key={s.label} style={{ textAlign: "center" }}>
                  <p style={{ fontSize: 16, fontWeight: 900 }}>{s.val}</p>
                  <p style={{ fontSize: 10, color: "rgba(162,155,254,0.4)", marginTop: 2 }}>{s.label}</p>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => handleFollow(selectedUser)} className={`btn ${(user.followingList || []).includes(selectedUser.uid) ? "btn-ghost" : "btn-primary"} btn-full`}>
                {(user.followingList || []).includes(selectedUser.uid) ? "Unfollow" : "\u{1F31F} Follow"}
              </button>
              <button onClick={() => handleFriendRequest(selectedUser)} className="btn btn-gold btn-full">
                {"\u{1F91D}"} Add Friend
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ padding: "0 16px" }}>
          {loading && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[1, 2, 3].map(i => (
                <div key={i} className="skeleton-card" style={{ display: "flex", gap: 12, alignItems: "center", padding: 14 }}>
                  <div className="skeleton skeleton-circle" style={{ width: 48, height: 48 }} />
                  <div style={{ flex: 1 }}>
                    <div className="skeleton skeleton-text" style={{ width: "60%", marginBottom: 6 }} />
                    <div className="skeleton skeleton-text" style={{ width: "40%" }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && searched && results.length === 0 && (
            <div style={{ textAlign: "center", padding: 40 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>{"\u{1F50D}"}</div>
              <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>No users found</p>
              <p style={{ fontSize: 12, color: "rgba(162,155,254,0.4)" }}>Try a different name or User ID</p>
            </div>
          )}

          {!loading && results.map((u, i) => {
            const blocked = isBlocked(user, u.uid);
            const isFollowing = (user.followingList || []).includes(u.uid);
            return (
              <div key={u.uid} onClick={() => !blocked && setSelectedUser(u)} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "12px 8px",
                borderBottom: "1px solid rgba(255,255,255,0.04)",
                cursor: blocked ? "not-allowed" : "pointer", opacity: blocked ? 0.4 : 1,
                animation: `slide-up 0.25s ease ${i * 0.05}s both`,
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 24, fontSize: 24,
                  background: "linear-gradient(135deg, rgba(108,92,231,0.2), rgba(108,92,231,0.08))",
                  border: "2px solid rgba(108,92,231,0.3)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 2px 10px rgba(108,92,231,0.12)",
                }}>
                  {u.avatar?.startsWith("http") ? (
                    <img src={u.avatar} alt="" style={{ width: "100%", height: "100%", borderRadius: 24, objectFit: "cover" }} />
                  ) : u.avatar}
                </div>
                <div style={{ flex: 1, overflow: "hidden" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.name}</p>
                    {u.vip && <span className="badge badge-vip" style={{ fontSize: 8, padding: "1px 5px" }}>{"\u{1F451}"}</span>}
                    <span className="badge badge-accent" style={{ fontSize: 8, padding: "1px 5px" }}>Lv.{u.level || 1}</span>
                  </div>
                  <p style={{ fontSize: 11, color: "rgba(162,155,254,0.4)", fontFamily: "monospace" }}>ID: {u.userId || "N/A"}</p>
                </div>
                {!blocked && (
                  <button onClick={e => { e.stopPropagation(); handleFollow(u); }}
                    className={`btn btn-sm ${isFollowing ? "btn-ghost" : "btn-primary"}`} style={{ fontSize: 11, padding: "5px 12px" }}>
                    {isFollowing ? "Following" : "Follow"}
                  </button>
                )}
              </div>
            );
          })}

          {!searched && !loading && (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <div style={{ fontSize: 48, marginBottom: 12, animation: "float 3s ease-in-out infinite" }}>{"\u{1F30C}"}</div>
              <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Discover People</p>
              <p style={{ fontSize: 12, color: "rgba(162,155,254,0.4)", lineHeight: 1.5 }}>Search by username or 9-digit User ID<br />to find and connect with others</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
