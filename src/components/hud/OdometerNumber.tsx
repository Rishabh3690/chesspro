import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useEmotion } from '../../context/EmotionContext';

let particleSeq = 0;

interface ParticleBurst {
  id: string;
  x: number;
  y: number;
  color: string;
}

interface SingleDigitProps {
  digit: string;
  themeColor: string;
  glowColor: string;
  onRollover?: () => void;
}

const UpwardRollingDigit: React.FC<SingleDigitProps> = ({
  digit,
  themeColor,
  glowColor,
  onRollover,
}) => {
  const prevDigitRef = useRef(digit);

  useEffect(() => {
    if (prevDigitRef.current !== digit) {
      prevDigitRef.current = digit;
      onRollover?.();
    }
  }, [digit, onRollover]);

  const isNumeric = /^\d$/.test(digit);

  if (!isNumeric) {
    return (
      <span
        className="font-mono font-bold text-lg sm:text-xl px-0.5"
        style={{ color: themeColor, textShadow: `0 0 10px ${glowColor}` }}
      >
        {digit}
      </span>
    );
  }

  return (
    <div className="relative w-4 sm:w-5 h-7 sm:h-8 overflow-hidden inline-flex items-center justify-center font-mono font-bold text-lg sm:text-xl">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={digit}
          initial={{ y: '90%', opacity: 0.25, filter: 'blur(2px)' }}
          animate={{ y: '0%', opacity: 1, filter: 'blur(0px)' }}
          exit={{ y: '-90%', opacity: 0.15, filter: 'blur(3px)' }}
          transition={{
            y: { type: 'spring', stiffness: 500, damping: 30 },
            opacity: { duration: 0.18 },
          }}
          className="absolute inset-0 flex items-center justify-center tabular-nums"
          style={{
            color: themeColor,
            textShadow: `0 0 12px ${glowColor}`,
          }}
        >
          {digit}
        </motion.span>
      </AnimatePresence>
    </div>
  );
};

export interface OdometerNumberProps {
  value: number | string; // e.g. 8.75 or 8750000
  suffix?: string;        // e.g. "M"
  prefix?: string;
  className?: string;
}

export const OdometerNumber: React.FC<OdometerNumberProps> = ({
  value,
  suffix = 'M',
  prefix = '',
  className = '',
}) => {
  const { theme } = useEmotion();
  const [particles, setParticles] = useState<ParticleBurst[]>([]);

  // Format value into string like "8.75" if number, or format decimal
  const formattedDigits = (() => {
    if (typeof value === 'number') {
      if (value >= 1_000_000) {
        return (value / 1_000_000).toFixed(2);
      }
      return value.toFixed(2);
    }
    // If passed as string like "8.75M" or "8.75"
    return value.replace(/[^\d.]/g, '') || '8.75';
  })();

  const triggerBurst = () => {
    const burstCount = 6;
    const newParticles: ParticleBurst[] = [];

    for (let i = 0; i < burstCount; i++) {
      const angle = (Math.PI * 2 * i) / burstCount + (Math.random() - 0.5) * 0.5;
      const distance = 12 + Math.random() * 18;
      const pid = `burst-${++particleSeq}-${Math.random().toString(36).slice(2, 7)}`;
      newParticles.push({
        id: pid,
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance - 8,
        color: theme.particleColor,
      });
    }

    setParticles((prev) => {
      const existingIds = new Set(prev.map((p) => p.id));
      const filteredNew = newParticles.filter((p) => !existingIds.has(p.id));
      return [...prev.slice(-14), ...filteredNew];
    });

    const newIds = new Set(newParticles.map((p) => p.id));
    setTimeout(() => {
      setParticles((prev) => prev.filter((p) => !newIds.has(p.id)));
    }, 450);
  };

  return (
    <div
      data-testid="odometer-number-container"
      className={`relative inline-flex items-center ${className}`}
    >
      {prefix && (
        <span
          className="font-mono text-xs sm:text-sm font-semibold mr-1"
          style={{ color: theme.textGlow }}
        >
          {prefix}
        </span>
      )}

      {/* Upward rolling digits */}
      <div className="flex items-center">
        {formattedDigits.split('').map((char, idx) => (
          <UpwardRollingDigit
            key={`char-${idx}`}
            digit={char}
            themeColor={theme.textGlow}
            glowColor={theme.textGlow}
            onRollover={triggerBurst}
          />
        ))}
      </div>

      {suffix && (
        <span
          className="font-mono text-xs sm:text-sm font-bold ml-0.5"
          style={{ color: theme.textGlow, textShadow: `0 0 8px ${theme.textGlow}` }}
        >
          {suffix}
        </span>
      )}

      {/* Tiny Particle Burst on Rollover with strictly unique keys */}
      <div className="absolute inset-0 pointer-events-none overflow-visible flex items-center justify-center">
        {particles.map((p) => (
          <motion.span
            key={p.id}
            initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
            animate={{ x: p.x, y: p.y, scale: 0.1, opacity: 0 }}
            transition={{ duration: 0.42, ease: 'easeOut' }}
            className="absolute w-1.5 h-1.5 rounded-full"
            style={{
              backgroundColor: p.color,
              boxShadow: `0 0 6px ${p.color}`,
            }}
          />
        ))}
      </div>
    </div>
  );
};
export default OdometerNumber;
