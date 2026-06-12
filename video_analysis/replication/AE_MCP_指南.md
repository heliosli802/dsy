# After Effects 有 MCP 吗？现状与配置指引

> 截至 2026 年 6 月的情况。

## 一句话结论

**Adobe 官方没有出 AE 的 MCP**，但社区有几个可用的第三方 MCP server，原理都是「MCP server（Node.js）↔ 桥接脚本 ↔ AE 的 ExtendScript 引擎」。装好后，Claude（Desktop / Claude Code）可以直接在你电脑上的 AE 里建合成、建图层、打关键帧、写表达式。**MCP server 必须装在装有 AE 的那台电脑上**——云端会话（比如现在这个）碰不到你本机的 AE。

## 主流社区实现

| 项目 | 特点 |
|---|---|
| [Dakkshin/after-effects-mcp](https://github.com/Dakkshin/after-effects-mcp) | 最流行。支持创建/列出合成，创建文本、形状、固态层，改图层属性，打关键帧、加表达式。通过 AE 内的"MCP Bridge Auto"面板轮询通信 |
| [p10q/ae-mcp](https://github.com/p10q/ae-mcp) | 文件桥方案（file-based bridge），同类能力 |

各 MCP 目录站的介绍页：[mcp.so](https://mcp.so/server/after-effects-mcp/Dakkshin)、[lobehub](https://lobehub.com/mcp/p10q-ae-mcp)、[mcpmarket](https://mcpmarket.com/server/after-effects)、[glama](https://glama.ai/mcp/servers/Dakkshin/after-effects-mcp)。

## 配置步骤（以 Dakkshin/after-effects-mcp 为例）

前置：本机装有 AE（2021+ 建议）、Node.js 18+、Claude Desktop 或 Claude Code。

```bash
git clone https://github.com/Dakkshin/after-effects-mcp.git
cd after-effects-mcp
npm install
npm run build        # 同时会安装 AE 桥接面板脚本
```

1. **AE 侧**：打开 AE → 首选项 → 脚本和表达式 → 勾选 **「允许脚本写入文件和访问网络」**；然后 窗口 → `mcp-bridge-auto.jsx`（桥接面板），保持面板开着。
2. **Claude 侧**（任选）：
   - Claude Code：`claude mcp add after-effects -- node <仓库路径>/build/index.js`
   - Claude Desktop：在 `claude_desktop_config.json` 里加：
     ```json
     {
       "mcpServers": {
         "after-effects": {
           "command": "node",
           "args": ["<仓库路径>/build/index.js"]
         }
       }
     }
     ```
3. 重启 Claude，对它说"在 AE 里新建一个 1920×1080 的合成"验证。

## 能做什么 / 做不到什么（针对复刻这个视频的风格）

**适合交给 MCP 的**：批量建层与排版、打 pop-in/slam 关键帧、挂 wiggle/计数表达式、批量改色改字——机械重复的部分。

**还得靠人/预设的**：纸纹胶带等材质素材（要自己收集 PNG）、摄像机运镜的"手感"、与配音逐句对齐的时间点、音效。所以推荐组合拳：

> 素材包 + `ae_style_pack.jsx` 预设（本目录）打底 → MCP 做批量机械操作 → 人工卡节奏。

## 安全提示

第三方 MCP = 在你机器上跑别人的代码，且 AE 要开放脚本写文件/访问网络权限。用前过一遍仓库源码（两个项目都不大），别在有敏感工程的机器上随手装。

## 没有 AE 时的替代复刻路径

- **代码渲染**：本目录 `render_demo.py`（Python+Pillow+ffmpeg 逐帧渲染，云端就能跑，demo_style.mp4 即其输出）；
- **Remotion / Motion Canvas**（React/TS 写动画出片，适合程序员）；
- **剪映专业版**：能仿 70~80%（关键帧+文字模板+贴纸），大画布长镜头和表达式计数难做。
