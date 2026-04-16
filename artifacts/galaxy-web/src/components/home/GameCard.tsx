const basePath = import.meta.env.BASE_URL || "/";

const GAME_BANNERS = [
  { id: 0, image: `${basePath}game_carrom.png`, fallback: "\u{1F3AF}" },
  { id: 1, image: `${basePath}game_truthdare.png`, fallback: "\u{1F525}" },
  { id: 2, image: `${basePath}game_candy.png`, fallback: "\u{1F36C}" },
  { id: 3, image: `${basePath}game_ludo.png`, fallback: "\u{1F3B2}" },
];

interface Props {
  onCreateRoom?: () => void;
}

export default function GameSection({ onCreateRoom }: Props) {
  return (
    <div className="hp-games-section">
      <div className="hp-section-header">
        <h2 className="hp-section-title">Games</h2>
        <button className="hp-create-room-btn" onClick={onCreateRoom}>
          <span>{"\u2795"}</span> Create Room
        </button>
      </div>
      <div className="hp-game-banner-list">
        {GAME_BANNERS.map((game) => (
          <div key={game.id} className="hp-game-banner-card">
            <img
              src={game.image}
              alt={`Game ${game.id + 1}`}
              className="hp-game-banner-img"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
                (e.target as HTMLImageElement).parentElement!.querySelector(".hp-game-banner-placeholder")!.classList.add("visible");
              }}
            />
            <div className="hp-game-banner-placeholder">
              <span style={{ fontSize: 30 }}>{game.fallback}</span>
              <span className="hp-game-banner-label">Add Banner {game.id + 1}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
