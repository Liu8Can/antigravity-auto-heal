# 介绍视频源码

本目录是项目介绍视频（`docs/intro.mp4`，1920×1080 / 30fps / 约 43 秒）的 [Remotion](https://www.remotion.dev/) 工程。

```bash
npm i
npm run dev        # 打开 Remotion Studio 预览与调整
npx remotion render Intro out/antigravity-auto-heal-intro.mp4 --crf=18
```

- 分镜在 `src/scenes/`，一个文件一个镜头；顺序与时长在 `src/Root.tsx`。
- 配色与字体在 `src/theme.tsx`。字体使用本机已安装的 Noto Sans SC 与 Cascadia Code，缺失时回退到微软雅黑 / Consolas。
- 视频无配音与配乐。
