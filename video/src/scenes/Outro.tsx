import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Backdrop, mono, p, rise, T } from "../theme";
import { HealRing } from "./Title";

export const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <Backdrop>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", textAlign: "center" }}>
        <div style={{ opacity: p(frame, 0, 12) }}>
          <HealRing size={170} start={2} />
        </div>
        <div style={{ fontSize: 110, fontWeight: 800, marginTop: 26, ...rise(frame, 10) }}>
          双击启动，剩下的交给它。
        </div>
        <div
          style={{
            marginTop: 50,
            fontFamily: mono,
            fontSize: 46,
            padding: "24px 44px",
            borderRadius: 18,
            backgroundColor: T.panel,
            border: `2px solid ${T.ok}66`,
            ...rise(frame, 24),
          }}
        >
          <span style={{ color: T.ok }}>▶</span> 启动Antigravity(带自动自愈).bat
        </div>
        <div style={{ marginTop: 56, fontFamily: mono, fontSize: 44, color: T.text, ...rise(frame, 38) }}>
          github.com/Liu8Can/antigravity-auto-heal
        </div>
        <div style={{ marginTop: 16, fontSize: 34, color: T.dim, ...rise(frame, 44) }}>
          MIT 开源 · Node.js ≥ 18 · Python 3.8+
        </div>
      </AbsoluteFill>
    </Backdrop>
  );
};
