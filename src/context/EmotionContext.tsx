import React, { createContext, useContext, useState, useMemo } from 'react';
import themeConfig from '../theme/theme.json';

export type EmotionType = 'calm' | 'confident' | 'angry' | 'sad';

export interface EmotionThemeConfig {
  name: string;
  subtitle: string;
  uiBorder: string;
  uiBorderGlow: string;
  textGlow: string;
  textShadow: string;
  surfaceBg: string;
  primary3d: string;
  secondary3d: string;
  core3d: string;
  reticleColor: string;
  gyroColor: string;
  stressColor: string;
  scaffoldCore: string;
  scaffoldMid: string;
  scaffoldOuter: string;
  rotationSpeed: number;
  pulseSpeed: number;
  glitchIntensity: number;
  shakeEnabled: boolean;
  hazardStripes: boolean;
  particleColor: string;
  screenShake?: boolean;
}

export interface EmotionContextValue {
  currentEmotion: EmotionType;
  setEmotion: (emotion: EmotionType) => void;
  cycleEmotion: () => void;
  theme: EmotionThemeConfig;
  allThemes: Record<EmotionType, EmotionThemeConfig>;
}

const EmotionContext = createContext<EmotionContextValue | null>(null);

export const EMOTION_ORDER: EmotionType[] = [
  'calm',
  'confident',
  'angry',
  'sad',
];

export const EmotionProvider: React.FC<{
  children: React.ReactNode;
  initialEmotion?: EmotionType;
}> = ({ children, initialEmotion = 'calm' }) => {
  const [currentEmotion, setEmotion] = useState<EmotionType>(initialEmotion);

  const rawThemes = themeConfig.emotions as Record<EmotionType, EmotionThemeConfig>;
  
  const allThemes = useMemo(() => {
    const result = {} as Record<EmotionType, EmotionThemeConfig>;
    for (const key of EMOTION_ORDER) {
      const raw = rawThemes[key];
      result[key] = {
        ...raw,
        screenShake: raw.shakeEnabled || key === 'angry',
      };
    }
    return result;
  }, [rawThemes]);

  const theme = allThemes[currentEmotion] || allThemes.calm;

  const cycleEmotion = () => {
    setEmotion((prev) => {
      const idx = EMOTION_ORDER.indexOf(prev);
      return EMOTION_ORDER[(idx + 1) % EMOTION_ORDER.length];
    });
  };

  const value = useMemo(
    () => ({
      currentEmotion,
      setEmotion,
      cycleEmotion,
      theme,
      allThemes,
    }),
    [currentEmotion, theme, allThemes]
  );

  return (
    <EmotionContext.Provider value={value}>{children}</EmotionContext.Provider>
  );
};

export function useEmotion(): EmotionContextValue {
  const ctx = useContext(EmotionContext);
  if (!ctx) {
    const fallbackThemes = themeConfig.emotions as Record<EmotionType, EmotionThemeConfig>;
    return {
      currentEmotion: 'calm',
      setEmotion: () => {},
      cycleEmotion: () => {},
      theme: fallbackThemes.calm,
      allThemes: fallbackThemes,
    };
  }
  return ctx;
}
