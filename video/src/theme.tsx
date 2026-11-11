import React from "react";
import { AbsoluteFill, Easing, interpolate } from "remotion";

export const T = {
  bg: "#0A0C11",
  panel: "#12161F",
  panel2: "#181D28",
  line: "#272E3D",
  text: "#EEF1F6",
  dim: "#8791A5",
  ok: "#45E0A0",
  warn: "#FFB547",
  bad: "#FF5D6C",
  accent: "#6EA8FF",
};

export const sans = '"Noto Sans SC","Microsoft YaHei",sans-serif';
export const mono = '"Cascadia Code",Consolas,"Noto Sans SC","Microsoft YaHei",monospace';

export const ease = Easing.bezier(0.16, 1, 0.3, 1);
export const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
  easing: ease,
} as const;

/** 0→1 progress starting at `start`, lasting `dur` frames. */
export const p = (frame: number, start: number, dur = 18) =>
  interpolate(frame, [start, start + dur], [0, 1], clamp);

/** Fade + rise entrance style. */
export const rise = (
  frame: number,
  start: number,
  dur = 18,
  dist = 36,
): React.CSSProperties => {
  const v = p(frame, start, dur);
  return { opacity: v, translate: `0px ${(1 - v) * dist}px` };
};

export const Backdrop: React.FC<{ glow?: string; children: React.ReactNode }> = ({
  glow = T.ok,
  children,
}) => (
  <AbsoluteFill style={{ backgroundColor: T.bg, fontFamily: sans, color: T.text }}>
    <AbsoluteFill
      style={{
        backgroundImage: `linear-gradient(${T.line}55 1px, transparent 1px), linear-gradient(90deg, ${T.line}55 1px, transparent 1px)`,
        backgroundSize: "80px 80px",
        maskImage: "radial-gradient(ellipse at 50% 40%, black 0%, transparent 75%)",
        WebkitMaskImage:
          "radial-gradient(ellipse at 50% 40%, black 0%, transparent 75%)",
      }}
    />
    <AbsoluteFill
      style={{
        background: `radial-gradient(900px 520px at 78% 8%, ${glow}1F, transparent 70%)`,
      }}
    />
    {children}
  </AbsoluteFill>
);

export const Kicker: React.FC<{ children: React.ReactNode; color?: string; style?: React.CSSProperties }> = ({
  children,
  color = T.ok,
  style,
}) => (
  <div
    style={{
      fontFamily: mono,
      fontSize: 34,
      letterSpacing: 4,
      color,
      marginBottom: 22,
      ...style,
    }}
  >
    {children}
  </div>
);
