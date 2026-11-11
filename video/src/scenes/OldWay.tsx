import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Backdrop, clamp, Kicker, mono, rise, T } from "../theme";

const STEPS = ["下载新汉化包", "关闭软件", "翻找安装路径", "粘贴覆盖 asar"];

export const OldWay: React.FC = () => {
  const frame = useCurrentFrame();
  // The loop accelerates: position along an ever-faster cycle through the 4 steps.
  const pos = interpolate(frame, [24, 135], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cursor = Math.pow(pos, 1.9) * 28;
  const active = Math.floor(cursor) % STEPS.length;
  const round = Math.floor(cursor / STEPS.length) + 1;

  return (
    <Backdrop glow={T.warn}>
      <AbsoluteFill style={{ padding: "110px 140px" }}>
        <Kicker color={T.warn} style={rise(frame, 0)}>
          传统汉化方案
        </Kicker>
        <div style={{ fontSize: 104, fontWeight: 800, lineHeight: 1.2, ...rise(frame, 4) }}>
          每更新一次，手动重来一遍。
        </div>

        <div style={{ display: "flex", gap: 28, marginTop: 110, alignItems: "stretch" }}>
          {STEPS.map((s, i) => {
            const on = frame >= 24 && active === i;
            return (
              <div
                key={s}
                style={{
                  flex: 1,
                  padding: "44px 36px",
                  borderRadius: 20,
                  border: `2px solid ${on ? T.warn : T.line}`,
                  backgroundColor: on ? "#2A2113" : T.panel,
                  ...rise(frame, 12 + i * 5),
                }}
              >
                <div style={{ fontFamily: mono, fontSize: 32, color: on ? T.warn : T.dim }}>0{i + 1}</div>
                <div style={{ fontSize: 50, fontWeight: 700, marginTop: 18, color: on ? T.text : T.dim }}>{s}</div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            marginTop: 90,
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            ...rise(frame, 30),
          }}
        >
          <div style={{ fontSize: 46, color: T.dim }}>
            而官方每 <span style={{ color: T.text, fontWeight: 700 }}>3 ~ 5 天</span> 就静默更新一次
          </div>
          <div style={{ fontFamily: mono, fontSize: 84, fontWeight: 700, color: T.warn }}>
            第 {round} 次
            <span style={{ opacity: interpolate(frame % 20, [0, 10, 20], [1, 0.2, 1], clamp) }}>…</span>
          </div>
        </div>
      </AbsoluteFill>
    </Backdrop>
  );
};
