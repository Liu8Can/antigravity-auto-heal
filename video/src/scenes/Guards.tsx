import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Backdrop, Kicker, mono, p, rise, T } from "../theme";

const GUARDS = [
  { t: "纯净母本", d: "永远从官方原版 app.asar.bak 出发，绝不在改过的代码上叠加" },
  { t: "幂等注入", d: "每个注入点自带指纹查重，执行多少次都只注入一次" },
  { t: "语法熔断", d: "任何一处编译报错，立即放弃，主程序一个字节都不动" },
  { t: "整句命中", d: "多词短语必须整句命中词典，拒绝“打开 Links In”式半中半英" },
];

export const Guards: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <Backdrop glow={T.accent}>
      <AbsoluteFill style={{ padding: "100px 140px" }}>
        <Kicker color={T.accent} style={rise(frame, 0)}>
          02 · 安全防线
        </Kicker>
        <div style={{ fontSize: 100, fontWeight: 800, ...rise(frame, 4) }}>
          四重防线，宁可不改，也不改坏。
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 30, marginTop: 60, flex: 1 }}>
          {GUARDS.map((g, i) => {
            const at = 24 + i * 28;
            const lit = p(frame, at + 10, 14);
            return (
              <div
                key={g.t}
                style={{
                  borderRadius: 22,
                  padding: "38px 44px",
                  backgroundColor: T.panel,
                  border: `2px solid ${T.line}`,
                  borderLeft: `10px solid rgba(110,168,255,${0.25 + lit * 0.75})`,
                  display: "flex",
                  gap: 34,
                  alignItems: "center",
                  ...rise(frame, at, 18, 40),
                }}
              >
                <div style={{ fontFamily: mono, fontSize: 120, fontWeight: 700, color: T.accent, opacity: 0.9, lineHeight: 1 }}>
                  {i + 1}
                </div>
                <div>
                  <div style={{ fontSize: 60, fontWeight: 800 }}>{g.t}</div>
                  <div style={{ fontSize: 36, color: T.dim, marginTop: 12, lineHeight: 1.45 }}>{g.d}</div>
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </Backdrop>
  );
};
