# 《阿Test正经比比》风格 · 拆解 + 复刻全套工具包

> ⚠️ 先澄清：`03_demo/demo_style.mp4` **不是用 AE 或 AE MCP 做的**——是用 Python(Pillow) 按拆解出的帧级参数逐帧渲染、ffmpeg 编码的复刻验证片。AE MCP 需要在你本机（装有 AE 的电脑）上配置，见 `02_tools/AE_MCP_guide.md`。

## 包内目录

```
00_README.md            ← 本文件
01_reports/             ← 拆解报告（核心成果）
  README.md             ← ★总报告：全片结构/技法字典(帧级参数)/转场体系/AE复现指南
  report_seg1..7.md     ← 7份分段逐秒时间轴拆解（seg2为seg1的复核版）
02_tools/
  ae_style_pack.jsx     ← ★AE 预设脚本包（一键应用全部入场动画/生成示例合成）
  render_demo.py        ← 代码渲染器（无AE也能出片，demo即其输出）
  AE_MCP_guide.md       ← AE MCP 现状与本机配置步骤
03_demo/
  demo_style.mp4        ← 12.5s 风格复刻演示片
04_pipeline/
  analyze_video.sh      ← ★拆解流水线脚本（可拆任何视频）
```

## 三条使用路径

### 路径一：学风格、上手做（最常用）
1. 读 `01_reports/README.md` 第二节（风格DNA：色值/字体/纹理）和第三节（技法字典：每个动画的帧数、缓动、错峰参数都给了）；
2. 开 AE → 文件 > 脚本 > 运行脚本文件 → 选 `02_tools/ae_style_pack.jsx`；
3. 点面板里的「★ 生成完整示例合成」，对照 `03_demo/demo_style.mp4` 和报告参数表理解每个动作；
4. 做自己的内容：选中图层 → 点对应按钮（弹入/重锤/盖章/画线/逐字重锤/抖动/计数器）。多选图层会自动按 2 帧错峰形成级联；
5. 素材准备清单和制作工作流在总报告第五节（纸纹/胶带/拍立得PNG、字体替代方案、音效清单、"先排版后运镜"流程）。

### 路径二：自己拆解任何视频（复用我这次的分析流程）
依赖：ffmpeg。流程就是我对这 30 分钟视频做的事：

```bash
./04_pipeline/analyze_video.sh info   视频.mp4                 # 看基本信息
./04_pipeline/analyze_video.sh frames 视频.mp4 输出目录          # 1秒/帧 + 20秒/张网格图 + 切点检测
# → 逐张看 输出目录/sheets/，对照 scenes.txt 写逐秒时间轴草稿
./04_pipeline/analyze_video.sh zoom   视频.mp4 输出目录 181.3 1.6 标题落字 10
# → 对看不清的动画瞬间做 10~15fps 慢放网格(标签=厘秒)，拆帧级过程
./04_pipeline/analyze_video.sh still  视频.mp4 输出目录 27 87 201
# → 全分辨率静帧核对字体/纹理/色值
```

报告模板（A~E 五段式）：A 逐秒时间轴拆解表 → B 技法清单（名称/时间码/帧级过程/AE实现）→ C 转场清单 → D 风格细节 → E 首末帧描述（多片段拼接时用来对顺序）。

### 路径三：让 Claude 直接操作你的 AE（进阶）
按 `02_tools/AE_MCP_guide.md` 在本机装社区 MCP server（Adobe 无官方版），之后可以让 Claude 拿着 `01_reports` 的参数直接在你的 AE 里搭工程。

## 复跑代码渲染 demo（可选）

```bash
pip install pillow numpy && sudo apt install ffmpeg fonts-noto-cjk fonts-noto-cjk-extra
python3 02_tools/render_demo.py     # 生成 frames/ 后:
ffmpeg -framerate 30 -i frames/f%04d.png -c:v libx264 -pix_fmt yuv420p -crf 20 demo_style.mp4
```

改 `render_demo.py` 里的 `E = {...}` 元素表和场景区块即可换成你自己的文案做新片——它本质上就是个用代码写的"迷你 AE"，所有缓动函数（`ease_out_back`/`slam`/`popin`/`writeon`/`wig`）与报告参数一一对应。
