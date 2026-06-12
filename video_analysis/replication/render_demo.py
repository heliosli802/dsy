#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
《阿Test正经比比》风格复刻 DEMO 渲染器
按拆解报告实测参数逐帧渲染：黑纸画布/pop-in过冲/大字slam/逐字重锤/write-on/
盖章/计数器/阵列级联/盖屏转场/whip转场/镜头慢漂移/posterize抖动/颗粒纹理
输出: demo_style.mp4 1024x576@30fps ~12.5s
"""
import math, os, random, hashlib
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H, FPS = 1024, 576, 30
DUR = 12.5
N = int(DUR * FPS)
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "frames")
os.makedirs(OUT, exist_ok=True)

BG    = (21, 21, 21)
GREEN = (205, 234, 74)
WHITE = (241, 250, 225)
RED   = (214, 69, 65)
PINK  = (243, 200, 192)
DARK  = (24, 24, 24)

NOTO_DIR = "/usr/share/fonts/opentype/noto"
def _sc_index(path):
    for i in range(6):
        try:
            f = ImageFont.truetype(path, 20, index=i)
            if "SC" in f.getname()[0]: return i
        except Exception: break
    return 0
BLACK_TTC = f"{NOTO_DIR}/NotoSansCJK-Black.ttc"
BOLD_TTC  = f"{NOTO_DIR}/NotoSansCJK-Bold.ttc"
IB, IBO = _sc_index(BLACK_TTC), _sc_index(BOLD_TTC)
def fblack(s): return ImageFont.truetype(BLACK_TTC, s, index=IB)
def fbold(s):  return ImageFont.truetype(BOLD_TTC, s, index=IBO)

# ---------- 缓动 ----------
def clamp01(x): return max(0.0, min(1.0, x))
def ease_out_cubic(t): t = clamp01(t); return 1 - (1 - t) ** 3
def ease_in_out(t): t = clamp01(t); return t * t * (3 - 2 * t)
def ease_in_expo(t): t = clamp01(t); return 0 if t == 0 else 2 ** (10 * (t - 1))
def ease_out_back(t, s=2.2):
    t = clamp01(t); t -= 1
    return 1 + (t * t * ((s + 1) * t + s))

def wig(name, t, amp=1.5, fps=10):
    """posterizeTime 式抖动: 每 1/fps 秒换一个确定性随机偏移"""
    step = int(t * fps)
    h = hashlib.md5(f"{name}:{step}".encode()).digest()
    return ((h[0] / 255 - .5) * 2 * amp, (h[1] / 255 - .5) * 2 * amp,
            (h[2] / 255 - .5) * 2 * 0.8)  # dx, dy, drot

# ---------- 纸纹底 ----------
def make_paper(w, h, seed=7):
    rng = np.random.default_rng(seed)
    base = np.full((h, w, 3), BG, dtype=np.float32)
    noise = rng.normal(0, 5.5, (h, w, 1))
    blotch = rng.normal(0, 1, (h // 32, w // 32, 1))
    blotch = np.array(Image.fromarray(
        ((blotch - blotch.min()) / (np.ptp(blotch) + 1e-6) * 255).astype(np.uint8)[:, :, 0]
    ).resize((w, h), Image.BILINEAR), dtype=np.float32)[:, :, None] / 255 * 10 - 5
    img = np.clip(base + noise + blotch, 0, 255).astype(np.uint8)
    im = Image.fromarray(img)
    d = ImageDraw.Draw(im, "RGBA")
    for _ in range(46):  # 划痕
        x0, y0 = rng.integers(0, w), rng.integers(0, h)
        ln, ang = rng.integers(30, 220), rng.uniform(0, math.pi)
        x1, y1 = x0 + ln * math.cos(ang), y0 + ln * math.sin(ang)
        d.line([x0, y0, x1, y1], fill=(255, 255, 255, rng.integers(4, 11)), width=1)
    for fx in rng.integers(0, w, 5):  # 折痕
        d.line([fx, 0, fx + rng.integers(-40, 40), h], fill=(0, 0, 0, 14), width=2)
        d.line([fx + 2, 0, fx + 42, h], fill=(255, 255, 255, 6), width=1)
    return im.convert("RGBA")

PAPER = make_paper(W * 2, H * 2)
_vy, _vx = np.mgrid[0:H, 0:W]
_vig = 1 - 0.32 * (((_vx / W - .5) ** 2 + (_vy / H - .5) ** 2) * 2.2) ** 1.4
VIG = np.clip(_vig, 0, 1)[:, :, None].astype(np.float32)

# ---------- 元素绘制 ----------
def paste_scaled(canvas, im, cx, cy, scale=1.0, rot=0.0, blur=0.0, alpha=255):
    if scale <= 0.01 or alpha <= 0: return
    w2, h2 = max(1, int(im.width * scale)), max(1, int(im.height * scale))
    im2 = im.resize((w2, h2), Image.LANCZOS)
    if rot: im2 = im2.rotate(rot, expand=True, resample=Image.BICUBIC)
    if blur > 0.2: im2 = im2.filter(ImageFilter.GaussianBlur(blur * scale))
    if alpha < 255:
        a = im2.getchannel("A").point(lambda v: v * alpha // 255)
        im2.putalpha(a)
    canvas.alpha_composite(im2, (int(cx - im2.width / 2), int(cy - im2.height / 2)))

def text_img(text, font, fill, stroke=0, stroke_fill=DARK, pad=None):
    d0 = ImageDraw.Draw(Image.new("RGBA", (8, 8)))
    box = d0.textbbox((0, 0), text, font=font, stroke_width=stroke)
    pad = pad if pad is not None else stroke + 8
    im = Image.new("RGBA", (box[2] - box[0] + pad * 2, box[3] - box[1] + pad * 2), (0, 0, 0, 0))
    ImageDraw.Draw(im).text((pad - box[0], pad - box[1]), text, font=font, fill=fill,
                            stroke_width=stroke, stroke_fill=stroke_fill)
    return im

def slam(canvas, name, t, t0, im, cx, cy, dur=5 / FPS, settle_wig=True):
    """大字重锤: 300%+模糊 -> 100% 清晰, 落定后抖动保持"""
    if t < t0: return
    p = ease_out_cubic((t - t0) / dur)
    s = 3.0 - 2.0 * p
    b = 8 * (1 - p)
    a = int(255 * min(1, p * 2.5 + .2))
    dx, dy, dr = wig(name, t) if (settle_wig and p >= 1) else (0, 0, 0)
    paste_scaled(canvas, im, cx + dx, cy + dy, s, dr, b, a)

def popin(canvas, name, t, t0, im, cx, cy, dur=6 / FPS, rot0=-4, wiggle=True):
    """pop-in 过冲回弹"""
    if t < t0: return
    p = (t - t0) / dur
    s = ease_out_back(p)
    r = rot0 * (1 - clamp01(p))
    dx, dy, dr = wig(name, t, 1.2) if (wiggle and p >= 1) else (0, 0, 0)
    paste_scaled(canvas, im, cx + dx, cy + dy, max(s, 0.01), r + dr)

def stamp(canvas, name, t, t0, im, cx, cy, dur=4 / FPS):
    """盖章: 300%->100% 砸下 + 旋转回正"""
    if t < t0: return
    p = ease_out_cubic((t - t0) / dur)
    dx, dy, dr = wig(name, t, 1.2) if p >= 1 else (0, 0, 0)
    paste_scaled(canvas, im, cx + dx, cy + dy, 3.0 - 2.0 * p, -8 * (1 - p) + dr,
                 0, int(255 * min(1, p * 3 + .15)))

def writeon(draw, t, t0, pts, dur, color=WHITE, width=6, arrow=True):
    """折线 write-on + 末端箭头"""
    if t < t0: return 0
    p = ease_in_out((t - t0) / dur)
    segs = [math.dist(pts[i], pts[i + 1]) for i in range(len(pts) - 1)]
    total, target = sum(segs), sum(segs) * p
    acc, drawn = 0, [pts[0]]
    for i, L in enumerate(segs):
        if acc + L >= target:
            k = (target - acc) / L
            drawn.append((pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k,
                          pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k))
            break
        drawn.append(pts[i + 1]); acc += L
    if len(drawn) > 1:
        draw.line([c for xy in drawn for c in xy], fill=color, width=width, joint="curve")
        for xy in drawn: draw.ellipse([xy[0]-width/2, xy[1]-width/2, xy[0]+width/2, xy[1]+width/2], fill=color)
    if arrow and p >= 1:
        (x0, y0), (x1, y1) = pts[-2], pts[-1]
        ang = math.atan2(y1 - y0, x1 - x0)
        for da in (2.65, -2.65):
            draw.line([x1, y1, x1 + 22 * math.cos(ang + da), y1 + 22 * math.sin(ang + da)],
                      fill=color, width=width)
    return p

def card(w, h, label=None, photo=None, tape=True):
    """白边拍立得卡片"""
    im = Image.new("RGBA", (w + 24, h + 24), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rectangle([16, 18, w + 8, h + 16], fill=(0, 0, 0, 110))           # 投影
    d.rectangle([12, 12, w + 12, h + 12], fill=WHITE)                    # 白边
    inner = [22, 22, w + 2, h - 22]
    d.rectangle(inner, fill=(38, 40, 36))
    if photo == "chart":                                                 # 卡内手绘小折线
        pts = [(34, h - 40), (w * .3, h * .55), (w * .5, h * .68), (w * .72, h * .3), (w - 8, h * .42)]
        d.line([c for xy in pts for c in xy], fill=WHITE, width=4, joint="curve")
    if label:
        f = fbold(22)
        d.rectangle([22, h - 16, 22 + f.getlength(label) + 16, h + 8], fill=DARK)
        d.text((30, h - 14), label, font=f, fill=WHITE)
    if tape:
        t = Image.new("RGBA", (84, 26), (200, 198, 188, 120))
        im.alpha_composite(t.rotate(-35, expand=True), (w - 30, -6))
    return im

def runner(t, x, y, draw, color=WHITE):
    """2帧循环跑步小人"""
    ph = int(t * 8) % 2
    d = draw
    d.ellipse([x - 7, y - 30, x + 7, y - 16], outline=color, width=4)
    d.line([x, y - 16, x, y + 2], fill=color, width=4)
    if ph == 0:
        d.line([x, y + 2, x - 10, y + 18], fill=color, width=4); d.line([x, y + 2, x + 12, y + 12], fill=color, width=4)
        d.line([x, y - 12, x + 12, y - 4], fill=color, width=4); d.line([x, y - 12, x - 10, y - 2], fill=color, width=4)
    else:
        d.line([x, y + 2, x + 10, y + 18], fill=color, width=4); d.line([x, y + 2, x - 12, y + 12], fill=color, width=4)
        d.line([x, y - 12, x - 12, y - 4], fill=color, width=4); d.line([x, y - 12, x + 10, y - 2], fill=color, width=4)

# ---------- 预渲染静态元素 ----------
E = {}
E["card1"]   = card(300, 220, "2006", "chart")
E["counter_small"] = None  # 动态
E["b850"]    = text_img("¥850万", fblack(54), WHITE)
E["badge50"] = text_img(" +50% ", fblack(44), DARK, 0); _d = ImageDraw.Draw(E["badge50"])
E["badge50"] = text_img(" +50% ", fblack(44), (24, 24, 24))
_tmp = Image.new("RGBA", (E["badge50"].width + 8, E["badge50"].height + 8), (0, 0, 0, 0))
ImageDraw.Draw(_tmp).rounded_rectangle([0, 6, _tmp.width - 6, _tmp.height - 4], 10, fill=GREEN)
_tmp.alpha_composite(E["badge50"], (1, 0)); E["badge50"] = _tmp
E["pork"]  = text_img("猪肉", fblack(92), WHITE)
E["p7"]    = text_img("¥7/斤", fbold(40), WHITE)
E["p14"]   = text_img("¥14/斤", fbold(40), GREEN)
for k in ("p7", "p14"):
    fr = Image.new("RGBA", (E[k].width + 22, E[k].height + 14), (0, 0, 0, 0))
    ImageDraw.Draw(fr).rectangle([0, 0, fr.width - 1, fr.height - 1], outline=WHITE, width=3)
    fr.alpha_composite(E[k], (11, 7)); E[k] = fr
E["chars"] = [text_img(c, fblack(120), GREEN, 6, (12, 14, 8)) for c in "投资跑步机"]
E["dollar"] = Image.new("RGBA", (300, 128), (0, 0, 0, 0))
_d = ImageDraw.Draw(E["dollar"])
_d.rounded_rectangle([0, 0, 299, 127], 8, fill=(110, 128, 96), outline=(225, 230, 210), width=4)
_d.ellipse([110, 24, 190, 104], outline=(225, 230, 210), width=4)
_d.text((150, 64), "$", font=fblack(56), fill=(228, 233, 214), anchor="mm")
E["tag"] = Image.new("RGBA", (56, 34), (0, 0, 0, 0))
ImageDraw.Draw(E["tag"]).rectangle([0, 0, 55, 33], fill=PINK)
ImageDraw.Draw(E["tag"]).text((28, 16), "1元", font=fbold(17), fill=(120, 40, 40), anchor="mm")
E["egg"] = Image.new("RGBA", (52, 60), (0, 0, 0, 0))
ImageDraw.Draw(E["egg"]).ellipse([4, 2, 48, 58], fill=(222, 188, 150), outline=(120, 95, 70), width=2)
E["unit"] = text_img("1.00钞/蛋", fblack(84), GREEN, 5, (12, 14, 8))
E["done"] = text_img("风格复刻完成", fblack(96), GREEN, 5, (12, 14, 8))
E["demo_bg"] = text_img("DEMO", fblack(230), (60, 64, 50))
TECHS = ["pop-in 过冲回弹", "大字 slam + wiggle", "逐字重锤落字", "write-on 画线",
         "盖章 / 徽章", "数字滚动计数", "阵列级联复制", "盖屏 / whip 转场", "镜头慢漂移"]
E["techs"] = [text_img("✓ " + s, fbold(30), WHITE) for s in TECHS]

SUBS = [(0, "假如2006年你有100万"), (1.0, "20年后它变成了3300万"),
        (2.2, "资产一路涨  还要盖章确认"), (4.2, "但猪肉也从7块涨到14块"),
        (6.0, "所以你得跑赢通胀这台跑步机"), (7.6, "钱和蛋  永远在赛跑"),
        (9.95, "以上技法  全部按拆解参数复现")]

# ---------- 镜头 ----------
def camera(t):
    """返回世界坐标系下镜头中心 x 与 zoom"""
    x = 0
    if t >= 2.2: x = 1024 * ease_in_out((t - 2.2) / 0.7)
    if t >= 4.2: x = 1024 + 1024 * ease_in_out((t - 4.2) / 0.7)
    if t >= 6.55: x = 3072
    if t >= 7.6:  x = 3072 + 1024 * ease_in_out((t - 7.6) / 0.27)
    if t >= 9.95: x = 5120
    drift = 14 * math.sin(t * 0.55) if t < 9.95 else 8 * (t - 9.95)   # 慢漂移/缓推
    zoom = 1.0
    if 9.6 <= t < 9.95: zoom = 1.0 + 0.07 * ease_out_cubic((t - 9.6) / 0.13)  # punch
    if t >= 9.95: zoom = 1.0 + 0.012 * (t - 9.95)
    return x + drift, zoom

def render(i):
    t = i / FPS
    camx, zoom = camera(t)
    fr = Image.new("RGBA", (W, H))
    px = int((camx * 0.18) % W)
    fr.alpha_composite(PAPER.crop((px, 30, px + W, 30 + H)))
    cv = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(cv, "RGBA")
    def sx(wx): return wx - camx + W / 2

    # —— 场景A (wx 0): 卡片 + 计数器 ——
    if camx < 900:
        popin(cv, "card1", t, 0.3, E["card1"], sx(140), 240)
        if t >= 1.0:
            p = clamp01((t - 1.0) / 0.55)
            val = 100 + (3300 - 100) * ease_out_cubic(p)
            steps = [100, 320, 780, 1450, 2160, 2810, 3300]
            v = steps[min(int(p * (len(steps) - 1) + 1e-6), len(steps) - 1)] if p < 1 else 3300
            fs = int(40 + 80 * ease_out_cubic(p))
            im = text_img(f"{v}万", fblack(fs), GREEN, max(2, fs // 18), (12, 14, 8))
            dx, dy, dr = wig("counter", t) if p >= 1 else (0, 0, 0)
            paste_scaled(cv, im, sx(150) + 230 + 60 * p + dx, 240 - 40 * p + dy, 1, dr)

    # —— 场景B (wx 1024): write-on 箭头 + 标签 + 徽章 ——
    if 200 < camx < 2000:
        b = 1024
        writeon(d, t, 2.7, [(sx(b - 330), 430), (sx(b - 160), 360), (sx(b - 60), 390), (sx(b + 130), 250)], 0.9)
        popin(cv, "b850", t, 3.25, E["b850"], sx(b + 130), 195)
        stamp(cv, "badge50", t, 3.7, E["badge50"], sx(b + 280), 300)

    # —— 场景C (wx 2048): 价格对比行 ——
    if 1300 < camx < 3000:
        c = 2048
        slam(cv, "pork", t, 4.55, E["pork"], sx(c - 230), 200)
        popin(cv, "p7", t, 4.95, E["p7"], sx(c - 250), 330)
        writeon(d, t, 5.15, [(sx(c - 150), 330), (sx(c + 40), 330)], 0.35, GREEN, 7)
        popin(cv, "p14", t, 5.55, E["p14"], sx(c + 150), 330)

    # —— 转场1 (6.0–6.55): 美元盖屏 ——
    if 6.0 <= t < 6.62:
        p = ease_in_expo((t - 6.0) / 0.55)
        paste_scaled(cv, E["dollar"], W / 2, H * 0.62 - p * 40, 0.45 + 5.5 * p, -4 * (1 - p))

    # —— 场景D (wx 3072): 逐字重锤 + 跑步机 ——
    if t >= 6.55 and camx < 3900:
        dd = 3072
        total_w = sum(im.width for im in E["chars"]) - len(E["chars"]) * 14
        x0 = sx(dd) - total_w / 2
        for ci, im in enumerate(E["chars"]):
            slam(cv, f"ch{ci}", t, 6.7 + ci * 3 / FPS, im, x0 + im.width / 2, 250, 5 / FPS)
            x0 += im.width - 14
        if t >= 7.15:
            pl, pr, py = sx(dd) - 240, sx(dd) + 240, 400
            d.rounded_rectangle([pl, py - 24, pr, py + 24], 24, outline=WHITE, width=4)
            off = int(t * 90) % 36
            for xx in range(int(pl) + 14 - off, int(pr) - 10, 36):
                if xx > pl + 8: d.line([xx, py + 10, xx + 12, py - 10], fill=(120, 122, 110), width=3)
            runner(t, pl + 60 + (t - 7.15) * 36 % (pr - pl - 120), py - 34, d)

    # —— 场景E (wx 4096): 阵列级联 + 单位slam ——
    if camx > 3500:
        e = 4096
        for r in range(5):
            for cidx in range(8):
                t0 = 7.95 + (r * 3 + cidx) * 1.2 / FPS
                popin(cv, f"tag{r}{cidx}", t, t0, E["tag"], sx(e - 380 + cidx * 62), 160 + r * 46, 4 / FPS, 0, False)
        for r in range(5):
            for cidx in range(6):
                t0 = 8.35 + (r * 3 + cidx) * 1.2 / FPS
                popin(cv, f"egg{r}{cidx}", t, t0, E["egg"], sx(e + 150 + cidx * 58), 156 + r * 64, 4 / FPS, 0, False)
        slam(cv, "unit", t, 9.25, E["unit"], sx(e), 470, 6 / FPS)

    # —— 场景F (wx 5120): 结尾清单 ——
    if camx > 4600:
        f0 = 5120
        paste_scaled(cv, E["demo_bg"], sx(f0), 300, 1, 0, 0, 70)
        slam(cv, "done", t, 10.15, E["done"], sx(f0), 120, 6 / FPS)
        for k, im in enumerate(E["techs"]):
            popin(cv, f"tech{k}", t, 10.5 + k * 0.16, im, sx(f0) - 180 + (k % 2) * 360, 215 + (k // 2) * 62, 5 / FPS, 0)

    # —— whip 模糊 (7.6–7.87) ——
    if 7.6 <= t < 7.87:
        cv = cv.filter(ImageFilter.BoxBlur((14, 0)))

    fr.alpha_composite(cv)

    # —— zoom punch 整帧缩放 ——
    if zoom > 1.001:
        zw, zh = int(W / zoom), int(H / zoom)
        fr = fr.crop(((W - zw) // 2, (H - zh) // 2, (W + zw) // 2, (H + zh) // 2)).resize((W, H), Image.LANCZOS)

    # —— 屏幕空间 UI ——
    ui = ImageDraw.Draw(fr, "RGBA")
    ui.text((28, 20), "风格复刻", font=fbold(24), fill=WHITE)
    ui.text((28, 50), "DEMO·非原片", font=fbold(15), fill=(160, 162, 150))
    ui.text((W - 24, 22), "动画拆解复现测试", font=fbold(14), fill=(150, 152, 140), anchor="ra")
    sub = ""
    for st, ss in SUBS:
        if t >= st: sub = ss
    ui.text((W / 2, H - 34), sub, font=fbold(28), fill=WHITE, anchor="mm",
            stroke_width=3, stroke_fill=(10, 10, 10))

    # —— 白闪(whip中点) / 颗粒 / 暗角 ——
    arr = np.asarray(fr.convert("RGB")).astype(np.float32)
    if 7.66 <= t < 7.76: arr = np.clip(arr + 70, 0, 255)
    rng = np.random.default_rng(i)
    arr = np.clip(arr * VIG + rng.normal(0, 4.2, arr.shape), 0, 255)
    Image.fromarray(arr.astype(np.uint8)).save(f"{OUT}/f{i:04d}.png")

if __name__ == "__main__":
    for i in range(N):
        render(i)
        if i % 75 == 0: print(f"frame {i}/{N}")
    print("done")
