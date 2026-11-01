import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useEmotion } from '../../context/EmotionContext';
import { useOdometer } from '../../hooks/useOdometer';
import { LichessPuzzleItem } from '../../game/lichessPuzzles250';

export interface TimerPanelProps {
  timeLeft: number;
  isTimerRunning: boolean;
  rushState: 'IDLE' | 'ACTIVE' | 'VICTORY' | 'TIME_UP';
  puzzle: LichessPuzzleItem;
  stepIndex: number;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
  onNext: () => void;
  onHintToggle: () => void;
  showHint: boolean;
}

/**
 * Mechanical slot machine single digit drum rolling DOWNWARD
 */
const InverseOdometerDigit: React.FC<{
  digit: number;
  isGlitching: boolean;
  themeColor: string;
  glowColor: string;
}> = ({ digit, isGlitching, themeColor, glowColor }) => {
  return (
    <div className="relative w-11 h-16 sm:w-13 sm:h-20 bg-black/60 rounded-lg overflow-hidden border border-white/10 shadow-inner flex items-center justify-center select-none">
      {/* Upper & lower mechanical shadow masks for authentic drum curve */}
      <div className="absolute inset-x-0 top-0 h-3 bg-gradient-to-b from-black via-black/60 to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-3 bg-gradient-to-t from-black via-black/60 to-transparent z-10 pointer-events-none" />

      {/* Phosphor glow trail behind drum */}
      <div
        className="absolute inset-0 opacity-40 blur-md pointer-events-none transition-all duration-300"
        style={{
          background: `radial-gradient(circle, ${glowColor} 0%, transparent 75%)`,
        }}
      />

      {/* Downward-rolling digit animation: enters from -100% (top) to 0, exits to 100% (bottom) */}
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={digit}
          initial={{ y: '-105%', opacity: 0.35, scale: 0.92, filter: 'blur(3px)' }}
          animate={{
            y: '0%',
            opacity: 1,
            scale: 1,
            filter: 'blur(0px)',
            x: isGlitching ? [0, -2, 2, -1, 1, 0] : 0,
          }}
          exit={{ y: '105%', opacity: 0.15, scale: 0.88, filter: 'blur(4px)' }}
          transition={{
            y: { type: 'spring', stiffness: 420, damping: 28 },
            opacity: { duration: 0.22 },
            x: isGlitching
              ? { repeat: Infinity, duration: 0.18, ease: 'linear' }
              : { duration: 0.2 },
          }}
          className={`font-mono text-3xl sm:text-4xl font-extrabold tracking-tight tabular-nums ${
            isGlitching ? 'animate-pulse' : ''
          }`}
          style={{
            color: themeColor,
            textShadow: isGlitching
              ? `0 0 16px ${glowColor}, 2px 0 2px #ef4444, -2px 0 2px #00f0ff`
              : `0 0 12px ${glowColor}`,
          }}
        >
          {digit}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export const TimerPanel: React.FC<TimerPanelProps> = ({
  timeLeft,
  isTimerRunning,
  rushState,
  puzzle,
  stepIndex,
  onStart,
  onStop,
  onReset,
  onNext,
  onHintToggle,
  showHint,
}) => {
  const { currentEmotion, theme } = useEmotion();
  const { digits, isGlitching } = useOdometer(timeLeft, {
    direction: 'down',
    padLength: 2,
    enableGlitchThreshold: 10,
  });

  // Emotional border shake variants for 'angry'
  const containerVariants = {
    calm: { x: 0, y: 0, transition: { duration: 0.3 } },
    confident: { x: 0, y: 0, scale: 1, transition: { duration: 0.2 } },
    angry: {
      x: [-2, 2, -3, 3, -1, 1, 0],
      y: [1, -1, 2, -2, 0],
      transition: { repeat: Infinity, duration: 0.32, ease: 'easeInOut' as const },
    },
    sad: {
      opacity: [0.95, 0.72, 0.95],
      transition: { repeat: Infinity, duration: 3.5, ease: 'easeInOut' as const },
    },
  };

  return (
    <motion.div
      data-testid="timer-panel"
      data-emotion={currentEmotion}
      variants={containerVariants}
      animate={currentEmotion}
      className="relative w-full h-full flex flex-col justify-between gap-3 p-3 sm:p-3.5 rounded-xl border transition-colors duration-300 overflow-hidden"
      style={{
        backgroundColor: theme.surfaceBg,
        borderColor: theme.uiBorder,
        boxShadow: `0 0 24px -4px ${theme.uiBorderGlow}`,
      }}
    >

      {/* TOP HEADER: Timer Status & Emotion Badge */}
      <div className="flex items-center justify-between gap-2 shrink-0 border-b border-white/[0.08] pb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{
              backgroundColor: theme.primary3d,
              boxShadow: `0 0 8px ${theme.primary3d}`,
            }}
          />
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-white truncate">
            Inverse Odometer
          </span>
        </div>
        <div
          data-testid="emotion-indicator"
          className="text-[10px] font-mono px-2 py-0.5 rounded border uppercase tracking-wider font-semibold"
          style={{
            borderColor: theme.uiBorder,
            color: theme.textGlow,
            backgroundColor: 'rgba(0,0,0,0.4)',
          }}
        >
          {theme.name}
        </div>
      </div>

      {/* CENTERPIECE: INVERSE ODOMETER CLOCK */}
      <div className="flex flex-col items-center justify-center my-auto py-2">
        <div className="flex items-center gap-1.5 relative">
          {digits.map((d, idx) => (
            <InverseOdometerDigit
              key={`drum-${idx}`}
              digit={d.current}
              isGlitching={isGlitching && isTimerRunning}
              themeColor={isGlitching ? '#f43f5e' : theme.textGlow}
              glowColor={isGlitching ? 'rgba(244,63,94,0.9)' : theme.textGlow}
            />
          ))}
          <span
            className="font-mono text-xl sm:text-2xl font-bold ml-1 self-end pb-2"
            style={{ color: isGlitching ? '#fb7185' : theme.textGlow }}
          >
            s
          </span>
        </div>

        {/* Dynamic subtext / warning state */}
        <div className="mt-2 text-center">
          <span
            data-testid="odometer-status-label"
            className="text-[10px] font-mono uppercase tracking-widest font-semibold transition-colors duration-200"
            style={{
              color: isGlitching ? '#fb7185' : 'rgba(255,255,255,0.7)',
            }}
          >
            {isGlitching
              ? 'CRITICAL < 10S // CHRONO GLITCH'
              : isTimerRunning
              ? 'ACTIVE COUNTDOWN // MECHANICAL DRUM'
              : rushState === 'TIME_UP'
              ? 'TIME EXPIRED'
              : 'CHRONO STANDBY'}
          </span>
        </div>
      </div>

      {/* PUZZLE BRIEFING BLOCK */}
      <div className="rounded-lg border border-white/[0.08] bg-black/40 p-2.5 space-y-1 text-xs font-mono">
        <div className="flex items-center justify-between text-[10px] text-slate-400">
          <span>PUZZLE #{puzzle.index}</span>
          <span className="text-slate-300 font-semibold">{puzzle.lichessId}</span>
        </div>
        <div className="text-white font-semibold truncate text-[11px]">
          {puzzle.title}
        </div>
        <div className="flex items-center justify-between text-[10px] pt-0.5">
          <span className="text-slate-400">Target</span>
          <span className="text-sky-300 font-bold">
            Mate in 2 ({stepIndex + 1}/2)
          </span>
        </div>
        {showHint && (
          <div className="pt-1.5 border-t border-white/[0.08] text-[10px] text-amber-300 leading-snug">
            Hint: {puzzle.hint}
          </div>
        )}
      </div>

      {/* CONTROLS STRIP */}
      <div className="space-y-1.5 shrink-0 pt-1">
        <button
          type="button"
          onClick={onStart}
          data-testid="start-puzzle-rush-btn"
          className="w-full py-2 px-3 rounded-lg font-mono font-bold text-xs uppercase tracking-wider text-slate-950 transition-transform active:scale-95 cursor-pointer shadow-lg"
          style={{
            backgroundColor: theme.textGlow,
            boxShadow: `0 0 16px ${theme.uiBorderGlow}`,
          }}
        >
          {rushState === 'ACTIVE' && isTimerRunning
            ? 'Restart Rush'
            : 'Start 30s Rush'}
        </button>

        <div className="grid grid-cols-3 gap-1.5 text-[10px] font-mono">
          <button
            type="button"
            onClick={onStop}
            data-testid="stop-timer-btn"
            className="py-1 px-1.5 rounded border border-white/10 bg-white/[0.04] hover:bg-white/[0.1] text-slate-200 transition-colors cursor-pointer text-center"
          >
            {isTimerRunning ? 'Stop' : 'Hold'}
          </button>
          <button
            type="button"
            onClick={onReset}
            data-testid="reset-timer-btn"
            className="py-1 px-1.5 rounded border border-white/10 bg-white/[0.04] hover:bg-white/[0.1] text-slate-200 transition-colors cursor-pointer text-center"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={onNext}
            data-testid="skip-puzzle-btn"
            className="py-1 px-1.5 rounded border border-white/10 bg-white/[0.04] hover:bg-white/[0.1] text-slate-200 transition-colors cursor-pointer text-center"
          >
            Next
          </button>
        </div>

        <button
          type="button"
          onClick={onHintToggle}
          data-testid="toggle-hint-btn"
          className="w-full py-1 rounded border border-white/10 bg-white/[0.02] hover:bg-white/[0.06] text-slate-300 text-[10px] font-mono transition-colors cursor-pointer"
        >
          {showHint ? 'Hide Tactical Hint' : 'Reveal Tactical Hint'}
        </button>
      </div>
    </motion.div>
  );
};
export default TimerPanel;
