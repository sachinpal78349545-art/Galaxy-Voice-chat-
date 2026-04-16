import { UserProfile, isSuperAdmin } from "../../lib/userService";

interface Props {
  user: UserProfile;
}

export default function Header({ user }: Props) {
  const formatId = (uid: string) => {
    const num = uid.replace(/\D/g, "").slice(0, 9);
    return num.length >= 4 ? num.padStart(9, "0") : uid.slice(0, 9);
  };

  return (
    <div className="hp-header">
      <div className="hp-header-left">
        <div className="hp-header-avatar">
          {user.avatar?.startsWith?.("http")
            ? <img src={user.avatar} alt="" />
            : <span className="hp-header-avatar-emoji">{user.avatar && user.avatar.length <= 4 ? user.avatar : "\u{1F464}"}</span>}
          <div className="hp-online-dot" />
        </div>
        <div className="hp-header-info">
          <h1 className="hp-app-name">Galaxy</h1>
          <p className="hp-welcome">Welcome, <span className="hp-username">{user.name}</span></p>
        </div>
      </div>
      <div className="hp-header-right">
        <div className="hp-header-icon-btn hp-icon-trophy">
          <span>{"\u{1F3C6}"}</span>
        </div>
        <div className="hp-header-icon-btn hp-icon-verified">
          <span>{"\u2714\uFE0F"}</span>
        </div>
        <div className="hp-header-icon-btn hp-icon-users">
          <span>{"\u{1F465}"}</span>
        </div>
        <div className="hp-coins-badge">
          <span className="hp-coins-icon">{"\u{1F48E}"}</span>
          <span className="hp-coins-count">{user.coins.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
