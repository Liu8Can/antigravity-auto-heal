import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Backdrop, Kicker, mono, p, rise, T } from "../theme";

const LINES: { tag: string; text: string; result: string; color: string }[] = [
  { tag: "检测", text: "app.asar 汉化标记", result: "缺失 · 官方已更新", color: T.warn },
  { tag: "母本", text: "app.asar → app.asar.bak", result: "纯净母本已刷新", color: T.ok },
  { tag: "注入", text: "engine.js · main-hook.js", result: "幂等，不重复", color: T.ok },
  { tag: "门禁", text: "全部改动文件语法编译", result: "100% 通过", color: T.ok },
  { tag: "写入", text: "临时文件 → 原子改名", result: "主程序安全", color: T.ok },
];

const FIRST = 40;
const STEP = 34;

export const HealLoop: React.FC = () => {
  const frame = useCurrentFrame();
  const doneAt = FIRST + LINES.length * STEP + 6;

  return (
    <Backdrop>
      <AbsoluteFill style={{ padding: "100px 140px" }}>
        <Kicker style={rise(frame, 0)}>01 · 启动自愈环</Kicker>
        <div style={{ fontSize: 100, fontWeight: 800, ...rise(frame, 4) }}>
          双击启动的一瞬间，它自己修好。
        </div>

        <div
          style={{
            marginTop: 54,
            flex: 1,
            borderRadius: 22,
            border: `1px solid ${T.line}`,
            backgroundColor: "#0D1016",
            padding: "40px 52px",
            fontFamily: mono,
            fontSize: 40,
            display: "flex",
            flexDirection: "column",
            gap: 24,
            boxShadow: "0 40px 120px rgba(0,0,0,.5)",
            ...rise(frame, 12, 22, 50),
          }}
        >
          <div style={{ color: T.dim, opacity: p(frame, 22, 10) }}>
            <span style={{ color: T.accent }}>&gt;</span> 启动Antigravity(带自动自愈).bat
          </div>
          {LINES.map((l, i) => {
            const at = FIRST + i * STEP;
            const resolved = frame >= at + 16;
            return (
              <div key={l.tag} style={{ display: "flex", alignItems: "center", ...rise(frame, at, 12, 16) }}>
                <span style={{ color: T.accent, width: 170 }}>[{l.tag}]</span>
                <span style={{ flex: 1 }}>{l.text}</span>
                <span style={{ color: resolved ? l.color : T.dim, fontWeight: 700 }}>
                  {resolved ? `${l.color === T.ok ? "✓" : "!"} ${l.result}` : "…"}
                </span>
              </div>
            );
          })}
          <div
            style={{
              marginTop: "auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderTop: `1px solid ${T.line}`,
              paddingTop: 26,
              ...rise(frame, doneAt, 16, 16),
            }}
          >
            <span style={{ color: T.ok, fontWeight: 700 }}>[完成] 拉起汉化版 Antigravity</span>
            <span style={{ fontSize: 56, fontWeight: 700, color: T.text }}>
              重建约 <span style={{ color: T.ok }}>50 ms</span>
            </span>
          </div>
        </div>
      </AbsoluteFill>
    </Backdrop>
  );
};
