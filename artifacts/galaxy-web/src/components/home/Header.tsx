import { UserProfile } from "../../lib/userService";

interface Props {
  user: UserProfile;
}

export default function Header({ user }: Props) {
  return (
    <div className="hp-header">
      <div className="hp-header-left">
        <div>
          <h1 className="hp-app-name">Galaxy</h1>
          <p className="hp-welcome">Welcome, @<span className="hp-username">{user.name}</span></p>
        </div>
      </div>
      <div className="hp-header-right">
        {[
          { icon: "\u{1F3C6}", label: "Ranking" },
          { icon: "\u2611\uFE0F", label: "Tasks" },
          { icon: "\u{1F465}", label: "Friends" },
        ].map((item) => (
          <div key={item.label} className="hp-top-icon">
            <span>{item.icon}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
