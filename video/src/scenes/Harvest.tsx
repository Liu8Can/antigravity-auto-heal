import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Backdrop, Kicker, mono, p, rise, T } from "../theme";

// Real entries from tool/runtime/engine.js
const WORDS: [string, string][] = [
  ["Close Tabs to the Right", "关闭右侧标签页"],
  ["Add Custom Model", "添加自定义模型"],
  ["Collapse queued messages", "折叠排队消息"],
  ["Add to allowlist", "添加到允许列表"],
  ["Open Links In", "链接打开方式"],
];

export const Harvest: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <Backdrop>
      <AbsoluteFill style={{ padding: "100px 140px" }}>
        <Kicker style={rise(frame, 0)}>03 · 后台自进化</Kicker>
        <div style={{ fontSize: 100, fontWeight: 800, ...rise(frame, 4) }}>
          新版多出来的词，它自己补上。
        </div>

        <div style={{ marginTop: 56, display: "flex", flexDirection: "column", gap: 18, flex: 1 }}>
          {WORDS.map(([en, zh], i) => {
            const at = 22 + i * 20;
            const done = p(frame, at + 14, 14);
            return (
              <div
                key={en}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "22px 40px",
                  borderRadius: 16,
                  backgroundColor: T.panel,
                  border: `1px solid ${T.line}`,
                  fontSize: 44,
                  ...rise(frame, at, 14, 24),
                }}
              >
                <span style={{ fontFamily: mono, color: T.dim, width: 760 }}>{en}</span>
                <span style={{ color: T.ok, fontFamily: mono, width: 120, opacity: done }}>→</span>
                <span style={{ fontWeight: 700, flex: 1, opacity: done, translate: `${(1 - done) * -24}px 0px` }}>{zh}</span>
                <span style={{ color: T.ok, fontWeight: 700, opacity: done }}>✓</span>
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 36, color: T.dim, marginTop: 34, ...rise(frame, 130) }}>
          <span>
            增量词库存在用户数据目录 <span style={{ fontFamily: mono, color: T.text }}>custom_dict.json</span>，官方更新不清空
          </span>
          <span>在线机翻可一键关闭</span>
        </div>
      </AbsoluteFill>
    </Backdrop>
  );
};
