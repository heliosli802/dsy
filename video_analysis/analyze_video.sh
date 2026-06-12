#!/usr/bin/env bash
# ============================================================
# 视频动画拆解流水线（本次30分钟视频分析所用的完整流程）
# 依赖: ffmpeg/ffprobe（含 drawtext 滤镜，需有 DejaVu 字体或自行指定 FONT）
#
# 用法:
#   ./analyze_video.sh info   <视频>                          # 看时长/分辨率/帧率
#   ./analyze_video.sh frames <视频> <输出目录>                # ①1秒/帧取图 ②拼5x4网格图 ③场景切换检测
#   ./analyze_video.sh zoom   <视频> <输出目录> <起始秒> <时长> <名称> [fps]
#                                                             # 对关键瞬间做高密度慢放网格图(默认10fps)
#   ./analyze_video.sh still  <视频> <输出目录> <秒1> [秒2 ...] # 抽全分辨率静帧核对细节
#
# 分析流程建议（对应报告的A-E结构）:
#   1. frames 跑完后逐张看 sheets/（每张=20秒），写出逐秒时间轴草稿
#   2. 对照 scenes.txt 的切点核对转场位置
#   3. 对每个看不清过程的动画瞬间跑 zoom（标签数字=厘秒），拆出帧级过程
#   4. 对字体/纹理/颜色存疑处跑 still 核对
#   5. 按模板成文: A逐秒时间轴 B技法清单 C转场清单 D风格细节 E首末帧
# ============================================================
set -euo pipefail
FONT="${FONT:-/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf}"

cmd="${1:-help}"; shift || true
case "$cmd" in
  info)
    ffprobe -v error -show_entries format=duration,size \
      -show_entries stream=codec_name,width,height,r_frame_rate,nb_frames \
      -of default=noprint_wrappers=1 "$1"
    ;;
  frames)
    V="$1"; OUT="$2"; mkdir -p "$OUT/frames_1s" "$OUT/sheets"
    echo "[1/3] 按1秒/帧取图(带秒数标签)..."
    ffmpeg -hide_banner -loglevel error -i "$V" \
      -vf "fps=1,scale=320:180,drawtext=fontfile=$FONT:text='%{eif\:n\:d}s':x=6:y=4:fontsize=22:fontcolor=yellow:box=1:boxcolor=black@0.6:boxborderw=3" \
      -start_number 0 "$OUT/frames_1s/f%04d.png"
    echo "[2/3] 拼5x4网格总览图(每张=20秒)..."
    ffmpeg -hide_banner -loglevel error -framerate 1 -start_number 0 \
      -i "$OUT/frames_1s/f%04d.png" \
      -vf "tile=5x4:padding=4:color=0x222222" -fps_mode passthrough \
      "$OUT/sheets/s%02d.png"
    echo "[3/3] 场景切换检测(阈值0.25)..."
    ffmpeg -hide_banner -i "$V" -vf "select='gt(scene,0.25)',showinfo" -f null - 2>&1 \
      | grep -o "pts_time:[0-9.]*" | cut -d: -f2 > "$OUT/scenes.txt"
    echo "完成: $(ls "$OUT/frames_1s" | wc -l) 帧, $(ls "$OUT/sheets" | wc -l) 张网格图, $(wc -l < "$OUT/scenes.txt") 个切点(见 scenes.txt)"
    ;;
  zoom)
    V="$1"; OUT="$2"; START="$3"; DUR="$4"; NAME="$5"; FPS="${6:-10}"
    mkdir -p "$OUT/detail"
    # 4x4网格(共16帧): DUR 建议 = 16/FPS；帧上标签数字=厘秒
    ffmpeg -hide_banner -loglevel error -ss "$START" -t "$DUR" -i "$V" \
      -vf "fps=$FPS,scale=380:-1,drawtext=fontfile=$FONT:text='%{eif\:trunc(t*100+$START*100)\:d}':x=3:y=2:fontsize=18:fontcolor=yellow:box=1:boxcolor=black@0.6,tile=4x4:padding=2:color=0x333333" \
      -frames:v 1 "$OUT/detail/z_${NAME}.png"
    echo "完成: $OUT/detail/z_${NAME}.png (标签=厘秒, ${FPS}fps)"
    ;;
  still)
    V="$1"; OUT="$2"; shift 2; mkdir -p "$OUT/detail"
    for t in "$@"; do
      ffmpeg -hide_banner -loglevel error -ss "$t" -i "$V" -frames:v 1 "$OUT/detail/still_${t}.png"
      echo "完成: $OUT/detail/still_${t}.png"
    done
    ;;
  *)
    sed -n '2,20p' "$0"
    ;;
esac
