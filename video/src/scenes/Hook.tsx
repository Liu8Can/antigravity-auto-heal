import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Backdrop, clamp, mono, p, rise, T } from "../theme";

const MENU: [string, string][] = [
  ["文件", "File"],
  ["编辑", "Edit"],
  ["选择", "Selection"],
  ["视图", "View"],
  ["转到", "Go"],
  ["运行", "Run"],
  ["终端", "Terminal"],
  ["帮助", "Help"],
];
const SIDE: [string, string][] = [
  ["打开文件夹", "Open Folder"],
  ["搜索", "Search"],
  ["浏览器", "Browser"],
  ["审查策略", "Review Policy"],
  ["设置", "Settings"],
];

const UPDATE_AT = 62;

const Label: React.FC<{ zh: string; en: string; flipAt: number }> = ({ zh, en, flipAt }) => {
  const frame = useCurrentFrame();
  const flipped = frame >= flipAt;
  const flash = interpolate(frame, [flipAt, flipAt + 12], [1, 0], clamp);
  return (
    <span
      style={{
        color: flipped ? T.dim : T.text,
        backgroundColor: `rgba(255,93,108,${flipped ? flash * 0.35 : 0})`,
        borderRadius: 6,
        padding: "2px 8px",
        margin: "0 -8px",
      }}
    >
      {flipped ? en : zh}
    </span>
  );
};

export const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const after = frame >= UPDATE_AT + 34;

  return (
    <Backdrop glow={after ? T.bad : T.ok}>
      <AbsoluteFill style={{ padding: "96px 140px" }}>
        <div style={{ height: 150, position: "relative" }}>
          <div
            style={{
              position: "absolute",
              fontSize: 100,
              fontWeight: 800,
              opacity: interpolate(frame, [0, 14, UPDATE_AT + 26, UPDATE_AT + 34], [0, 1, 1, 0], clamp),
            }}
          >
            昨天，汉化还好好的。
          </div>
          <div
            style={{
              position: "absolute",
              fontSize: 100,
              fontWeight: 800,
              ...rise(frame, UPDATE_AT + 34, 16),
            }}
          >
            官方一更新，<span style={{ color: T.bad }}>全没了。</span>
          </div>
        </div>

        {/* mock app window */}
        <div
          style={{
            marginTop: 40,
            flex: 1,
            borderRadius: 22,
            border: `1px solid ${T.line}`,
            backgroundColor: T.panel,
            overflow: "hidden",
            position: "relative",
            boxShadow: "0 40px 120px rgba(0,0,0,.55)",
            ...rise(frame, 6, 22, 60),
          }}
        >
          <div
            style={{
              height: 84,
              display: "flex",
              alignItems: "center",
              gap: 44,
              padding: "0 36px",
              borderBottom: `1px solid ${T.line}`,
              backgroundColor: T.panel2,
              fontSize: 34,
            }}
          >
            <div style={{ display: "flex", gap: 12, marginRight: 8 }}>
              {[T.bad, T.warn, T.ok].map((c) => (
                <div key={c} style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: c, opacity: 0.8 }} />
              ))}
            </div>
            {MENU.map(([zh, en], i) => (
              <Label key={en} zh={zh} en={en} flipAt={UPDATE_AT + 4 + i * 3} />
            ))}
          </div>

          <div style={{ display: "flex", height: "100%" }}>
            <div
              style={{
                width: 520,
                padding: "40px 44px",
                borderRight: `1px solid ${T.line}`,
                display: "flex",
                flexDirection: "column",
                gap: 34,
                fontSize: 40,
              }}
            >
              {SIDE.map(([zh, en], i) => (
                <div key={en} style={{ display: "flex", alignItems: "center", gap: 22 }}>
                  <div style={{ width: 14, height: 14, borderRadius: 4, backgroundColor: T.line }} />
                  <Label zh={zh} en={en} flipAt={UPDATE_AT + 10 + i * 4} />
                </div>
              ))}
            </div>
            <div style={{ flex: 1, padding: "48px 56px", display: "flex", flexDirection: "column", gap: 26 }}>
              {[0.72, 0.9, 0.55, 0.8, 0.42, 0.66].map((w, i) => (
                <div
                  key={i}
                  style={{ height: 22, width: `${w * 100}%`, borderRadius: 11, backgroundColor: T.line, opacity: 0.6 }}
                />
              ))}
            </div>
          </div>

          {/* update sweep */}
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              width: 6,
              left: `${interpolate(frame, [UPDATE_AT, UPDATE_AT + 34], [-2, 102], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}%`,
              backgroundColor: T.bad,
              boxShadow: `0 0 60px 18px ${T.bad}88`,
            }}
          />

          {/* update toast */}
          <div
            style={{
              position: "absolute",
              right: 40,
              bottom: 40,
              padding: "22px 34px",
              borderRadius: 16,
              backgroundColor: "#1E1418",
              border: `1px solid ${T.bad}88`,
              fontFamily: mono,
              fontSize: 34,
              color: T.bad,
              opacity: p(frame, UPDATE_AT - 14, 12),
              translate: `0px ${(1 - p(frame, UPDATE_AT - 14, 12)) * 30}px`,
            }}
          >
            ↻ 官方静默更新 · app.asar 已被覆盖
          </div>
        </div>
      </AbsoluteFill>
    </Backdrop>
  );
};
