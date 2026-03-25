import { useMemo } from 'react';

export function Stars() {
  const stars = useMemo(() => {
    return Array.from({ length: 80 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: Math.random() * 2.5 + 0.5,
      duration: Math.random() * 4 + 2,
      delay: Math.random() * 4,
      opacity: Math.random() * 0.5 + 0.2,
    }));
  }, []);

  return (
    <div className="stars-bg">
      {stars.map(star => (
        <div
          key={star.id}
          className="star"
          style={{
            left: `${star.left}%`,
            top: `${star.top}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            '--duration': `${star.duration}s`,
            '--delay': `${star.delay}s`,
            '--opacity': star.opacity,
          } as React.CSSProperties}
        />
      ))}
      <div
        className="gradient-orb"
        style={{
          width: 300, height: 300,
          background: 'radial-gradient(circle, rgba(108, 92, 231, 0.15) 0%, transparent 70%)',
          top: -100, left: -50,
        }}
      />
      <div
        className="gradient-orb"
        style={{
          width: 250, height: 250,
          background: 'radial-gradient(circle, rgba(162, 155, 254, 0.1) 0%, transparent 70%)',
          bottom: 100, right: -50,
        }}
      />
    </div>
  );
}
