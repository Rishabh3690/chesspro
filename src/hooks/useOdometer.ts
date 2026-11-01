import { useEffect, useRef, useState, useMemo } from 'react';

export type OdometerDirection = 'down' | 'up';

export interface UseOdometerOptions {
  direction?: OdometerDirection;
  padLength?: number;
  enableGlitchThreshold?: number; // e.g. 10 for timer < 10s
}

export interface DigitState {
  current: number;
  prev: number;
  hasChanged: boolean;
  key: string;
}

export interface UseOdometerReturn {
  digits: DigitState[];
  isGlitching: boolean;
  direction: OdometerDirection;
  trailGlowIntensity: number;
  formattedString: string;
}

/**
 * useOdometer: Custom hook for mechanical slot-machine roll transitions,
 * glowing trails, and glitch pulse when entering critical thresholds.
 */
export function useOdometer(
  value: number,
  options: UseOdometerOptions = {}
): UseOdometerReturn {
  const {
    direction = 'down',
    padLength = 2,
    enableGlitchThreshold = 10,
  } = options;

  const [prevValue, setPrevValue] = useState<number>(value);

  // Formatted string representation with padding
  const currentStr = useMemo(() => {
    const raw = Math.max(0, Math.floor(value)).toString();
    return raw.padStart(padLength, '0');
  }, [value, padLength]);

  const prevStr = useMemo(() => {
    const raw = Math.max(0, Math.floor(prevValue)).toString();
    return raw.padStart(padLength, '0');
  }, [prevValue, padLength]);

  useEffect(() => {
    if (prevValue !== value) {
      const timer = setTimeout(() => {
        setPrevValue(value);
      }, 450);
      return () => clearTimeout(timer);
    }
  }, [value, prevValue]);

  const hasRolled = prevValue !== value;

  const digits = useMemo<DigitState[]>(() => {
    return currentStr.split('').map((char, index) => {
      const current = parseInt(char, 10) || 0;
      const prevChar = prevStr[index] ?? char;
      const prev = parseInt(prevChar, 10) || 0;
      return {
        current,
        prev,
        hasChanged: current !== prev,
        key: `digit-${index}-${current}`,
      };
    });
  }, [currentStr, prevStr]);

  const isGlitching =
    typeof enableGlitchThreshold === 'number' &&
    value <= enableGlitchThreshold &&
    value > 0;

  // Trail glow is enhanced during active rolls or critical sub-10s time
  const trailGlowIntensity = isGlitching ? 1.0 : hasRolled ? 0.8 : 0.4;

  return {
    digits,
    isGlitching,
    direction,
    trailGlowIntensity,
    formattedString: currentStr,
  };
}
