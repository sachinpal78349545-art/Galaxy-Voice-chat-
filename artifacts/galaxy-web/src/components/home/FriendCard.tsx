interface FriendUser {
  uid: string;
  name: string;
  avatar: string;
  level?: number;
}

interface Props {
  users: FriendUser[];
  onMessage?: (uid: string) => void;
}

export default function FriendSection({ users, onMessage }: Props) {
  const formatId = (uid: string) => {
    const num = uid.replace(/\D/g, "").slice(0, 9);
    return num.length >= 4 ? num.padStart(9, "0") : uid.slice(0, 9);
  };

  if (users.length === 0) return null;

  return (
    <div className="hp-friends-section">
      <div className="hp-section-header">
        <h2 className="hp-section-title">{"\u{1F465}"} Find Friends</h2>
        <span className="hp-section-more">View All</span>
      </div>
      <div className="hp-friends-list">
        {users.map((u, i) => (
          <div key={u.uid} className="hp-friend-card" style={{ animationDelay: `${i * 0.05}s` }}>
            <div className="hp-friend-avatar">
              {u.avatar?.startsWith?.("http") ? (
                <img src={u.avatar} alt="" onError={e => {
                  (e.target as HTMLImageElement).style.display = "none";
                  (e.target as HTMLImageElement).parentElement!.innerHTML = '<span style="font-size:22px">\u{1F464}</span>';
                }} />
              ) : (
                <span className="hp-friend-emoji">{u.avatar && u.avatar.length <= 4 ? u.avatar : "\u{1F464}"}</span>
              )}
              <div className="hp-friend-online" />
            </div>
            <div className="hp-friend-info">
              <p className="hp-friend-name">{u.name}</p>
              <div className="hp-friend-meta">
                <span className="hp-friend-level">Lv.{u.level || 1}</span>
                <span className="hp-friend-id">ID: {formatId(u.uid)}</span>
              </div>
            </div>
            <button className="hp-friend-action" onClick={() => onMessage?.(u.uid)}>
              {"\u{1F4AC}"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
