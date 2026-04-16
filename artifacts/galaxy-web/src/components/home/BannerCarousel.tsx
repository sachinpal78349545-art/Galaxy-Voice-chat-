import { useState, useEffect, useRef } from "react";

const basePath = import.meta.env.BASE_URL || "/";

const BANNERS = [
  {
    id: "portal",
    image: `${basePath}banner1.png`,
    title: "New Function",
    subtitle: "Discover magical voice rooms",
    badge: "NEW",
    gradient: "linear-gradient(135deg, rgba(255,215,0,0.3), rgba(191,0,255,0.2))",
  },
  {
    id: "gaming",
    image: `${basePath}banner2.png`,
    title: "Game Rooms",
    subtitle: "Play with friends worldwide",
    badge: "HOT",
    gradient: "linear-gradient(135deg, rgba(108,92,231,0.3), rgba(0,230,118,0.15))",
  },
  {
    id: "rewards",
    image: `${basePath}banner3.png`,
    title: "Daily Rewards",
    subtitle: "Claim coins & gifts every day",
    badge: "REWARDS",
    gradient: "linear-gradient(135deg, rgba(255,100,50,0.3), rgba(255,215,0,0.2))",
  },
];

export default function BannerCarousel() {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef(0);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => {
      setCurrent(prev => (prev + 1) % BANNERS.length);
    }, 3500);
    return () => clearInterval(timer);
  }, [paused]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchX.current = e.touches[0].clientX;
    setPaused(true);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(diff) > 40) {
      if (diff < 0) setCurrent(prev => (prev + 1) % BANNERS.length);
      else setCurrent(prev => (prev - 1 + BANNERS.length) % BANNERS.length);
    }
    setTimeout(() => setPaused(false), 1000);
  };

  return (
    <div className="hp-banner-wrap">
      <div
        className="hp-banner-track"
        style={{ transform: `translateX(-${current * 100}%)` }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {BANNERS.map((b) => (
          <div key={b.id} className="hp-banner-slide">
            <div className="hp-banner-card" style={{ background: b.gradient }}>
              <img src={b.image} alt={b.title} className="hp-banner-img" onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }} />
              <div className="hp-banner-overlay" />
              <div className="hp-banner-content">
                <span className="hp-banner-badge">{b.badge}</span>
                <h3 className="hp-banner-title">{b.title}</h3>
                <p className="hp-banner-subtitle">{b.subtitle}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="hp-banner-dots">
        {BANNERS.map((_, i) => (
          <button
            key={i}
            className={`hp-banner-dot${current === i ? " active" : ""}`}
            onClick={() => { setCurrent(i); setPaused(false); }}
          />
        ))}
      </div>
    </div>
  );
}
