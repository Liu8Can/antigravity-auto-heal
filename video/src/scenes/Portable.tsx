import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Backdrop, Kicker, mono, rise, T } from "../theme";

export const Portable: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <Backdrop glow={T.accent}>
      <AbsoluteFill style={{ padding: "110px 140px", justifyContent: "center" }}>
        <Kicker color={T.accent} style={rise(frame, 0)}>
          不止 Antigravity
        </Kicker>
        <div style={{ fontSize: 100, fontWeight: 800, lineHeight: 1.25, ...rise(frame, 4) }}>
          同一套架构，可迁移到
          <br />
          绝大多数 Electron 应用。
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 26, marginTop: 70, fontFamily: mono, fontSize: 46 }}>
          {["Electron", "resources/app.asar", "preload.js"].map((t, i) => (
            <React.Fragment key={t}>
              {i > 0 && <span style={{ color: T.dim, ...rise(frame, 22 + i * 8) }}>+</span>}
              <div
                style={{
                  padding: "22px 36px",
                  borderRadius: 16,
                  backgroundColor: T.panel,
                  border: `2px solid ${T.accent}66`,
                  ...rise(frame, 22 + i * 8),
                }}
              >
                {t}
              </div>
            </React.Fragment>
          ))}
        </div>

        <div style={{ fontSize: 44, color: T.dim, marginTop: 56, ...rise(frame, 56) }}>
          只需换两样：<span style={{ color: T.text, fontWeight: 700 }}>安全区黑名单</span> 与{" "}
          <span style={{ color: T.text, fontWeight: 700 }}>领域术语词典</span>
        </div>
      </AbsoluteFill>
    </Backdrop>
  );
};
