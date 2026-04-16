import { UserProfile, isSuperAdmin } from "../../lib/userService";

interface Props {
  user: UserProfile;
}

export default function Header({ user }: Props) {
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
        <div className="hp-float-icon hp-float-search">
          <span>{"\u{1F50D}"}</span>
        </div>
        <div className="hp-float-icon hp-float-bell">
          <span>{"\u{1F514}"}</span>
          <div className="hp-bell-glow" />
        </div>
        <div className="hp-coins-badge">
          <span className="hp-coins-icon">{"\u{1F48E}"}</span>
          <span className="hp-coins-count">{user.coins.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
