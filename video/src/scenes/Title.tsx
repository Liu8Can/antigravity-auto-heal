import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Backdrop, clamp, mono, p, rise, T } from "../theme";

const R = 150;
const CIRC = 2 * Math.PI * R;

export const HealRing: React.FC<{ size?: number; start?: number }> = ({ size = 360, start = 0 }) => {
  const frame = useCurrentFrame();
  return (
    <svg width={size} height={size} viewBox="0 0 360 360">
      <circle cx={180} cy={180} r={R} fill="none" stroke={T.line} strokeWidth={14} />
      <circle
        cx={180}
        cy={180}
        r={R}
        fill="none"
        stroke={T.ok}
        strokeWidth={14}
        strokeLinecap="round"
        strokeDasharray={CIRC}
        strokeDashoffset={interpolate(frame, [start, start + 34], [CIRC, 0], clamp)}
        transform="rotate(-90 180 180)"
      />
      <path
        d="M118 184 L162 226 L246 138"
        fill="none"
        stroke={T.ok}
        strokeWidth={18}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={190}
        strokeDashoffset={interpolate(frame, [start + 26, start + 44], [190, 0], clamp)}
      />
    </svg>
  );
};

export const Title: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <Backdrop>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 90 }}>
        <div style={{ scale: interpolate(frame, [0, 30], [0.8, 1], clamp), opacity: p(frame, 0, 12) }}>
          <HealRing />
        </div>
        <div>
          <div style={{ fontFamily: mono, fontSize: 124, fontWeight: 700, letterSpacing: -2, ...rise(frame, 14) }}>
            Auto<span style={{ color: T.ok }}>-Heal</span>
          </div>
          <div style={{ fontSize: 60, fontWeight: 700, marginTop: 6, ...rise(frame, 22) }}>
            Antigravity 无感自愈汉化体系
          </div>
          <div style={{ display: "flex", gap: 20, marginTop: 44 }}>
            {["零人工介入", "启动即自愈", "后台自进化"].map((t, i) => (
              <div
                key={t}
                style={{
                  fontSize: 40,
                  padding: "14px 30px",
                  borderRadius: 999,
                  border: `2px solid ${T.ok}66`,
                  color: T.ok,
                  backgroundColor: `${T.ok}12`,
                  ...rise(frame, 36 + i * 6),
                }}
              >
                {t}
              </div>
            ))}
          </div>
        </div>
      </AbsoluteFill>
    </Backdrop>
  );
};
