import { useEffect, useState } from 'react';

interface Props {
  emoji: string;
  name: string;
}

export function GiftAnimation({ emoji, name }: Props) {
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; emoji: string }[]>([]);

  useEffect(() => {
    const ps = Array.from({ length: 8 }, (_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 200,
      y: -(Math.random() * 200 + 50),
      emoji: ['✨', '⭐', '💫', '🌟'][Math.floor(Math.random() * 4)],
    }));
    setParticles(ps);
  }, []);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      pointerEvents: 'none',
    }}>
      {/* Main gift */}
      <div style={{ position: 'relative', animation: 'gift-pop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards' }}>
        <div style={{
          fontSize: 80,
          filter: 'drop-shadow(0 0 30px rgba(108, 92, 231, 0.9))',
          animation: 'gift-float 3s ease-in-out',
        }}>
          {emoji}
        </div>
        <div style={{
          textAlign: 'center', marginTop: 8,
          background: 'linear-gradient(135deg, #6C5CE7, #A29BFE)',
          borderRadius: 20, padding: '6px 16px',
          fontSize: 14, fontWeight: 700, color: 'white',
          boxShadow: '0 0 20px rgba(108, 92, 231, 0.8)',
          animation: 'gift-label 3s ease-in-out',
        }}>
          {name}
        </div>
      </div>

      {/* Particles */}
      {particles.map(p => (
        <div key={p.id} style={{
          position: 'absolute',
          top: '50%', left: '50%',
          fontSize: 20,
          animation: `particle-fly 2s ease-out forwards`,
          animationDelay: `${p.id * 0.1}s`,
          '--tx': `${p.x}px`,
          '--ty': `${p.y}px`,
        } as React.CSSProperties}>
          {p.emoji}
        </div>
      ))}
    </div>
  );
}
