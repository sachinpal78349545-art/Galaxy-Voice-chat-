const basePath = import.meta.env.BASE_URL || "/";

const GAMES = [
  { id: "carrom", name: "Carrom", image: `${basePath}game_carrom.png`, color: "#f59e0b", glow: "rgba(245,158,11,0.4)", emoji: "\u{1F3AF}" },
  { id: "truth_dare", name: "Truth & Dare", image: `${basePath}game_truthdare.png`, color: "#ec4899", glow: "rgba(236,72,153,0.4)", emoji: "\u{1F525}" },
  { id: "candy", name: "Yummy Crush", image: `${basePath}game_candy.png`, color: "#06b6d4", glow: "rgba(6,182,212,0.4)", emoji: "\u{1F36C}" },
  { id: "ludo", name: "Ludo", image: `${basePath}game_ludo.png`, color: "#ef4444", glow: "rgba(239,68,68,0.4)", emoji: "\u{1F3B2}" },
];

interface Props {
  onCreateRoom?: () => void;
}

export default function GameSection({ onCreateRoom }: Props) {
  return (
    <div className="hp-games-section">
      <div className="hp-section-header">
        <h2 className="hp-section-title">{"\u{1F3AE}"} Games</h2>
        <button className="hp-create-room-btn" onClick={onCreateRoom}>
          {"\uFF0B"} Create Room
        </button>
      </div>
      <div className="hp-games-vertical">
        {GAMES.map((game, i) => (
          <div
            key={game.id}
            className="hp-game-card-v"
            style={{
              "--game-glow": game.glow,
              "--game-color": game.color,
              animationDelay: `${i * 0.08}s`,
            } as React.CSSProperties}
          >
            <div className="hp-game-img-wrap-v">
              <img src={game.image} alt={game.name} className="hp-game-img-v" onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
                (e.target as HTMLImageElement).parentElement!.innerHTML = `<span style="font-size:36px">${game.emoji}</span>`;
              }} />
            </div>
            <div className="hp-game-info-v">
              <p className="hp-game-name-v">{game.name}</p>
              <p className="hp-game-players-v">Tap to play</p>
            </div>
            <div className="hp-game-play-btn" style={{ background: `linear-gradient(135deg, ${game.color}, ${game.color}88)` }}>
              Play
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
