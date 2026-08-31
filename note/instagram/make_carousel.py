#!/usr/bin/env python3
"""
Instagram カルーセル画像ジェネレータ ── 人事の失敗図鑑

使い方:
    python3 note/instagram/make_carousel.py note/instagram/slides/00.txt

出力先:
    note/instagram/out/00/01.png 〜 10.png（1080×1350 / 4:5）

スライド原稿の書き方（slides/*.txt）:

    [cover] この図鑑には、私の失敗しか載っていません
    この図鑑には、
    私の失敗しか
    載っていません

    [body]
    「面接で聞いた話と、
    入ってからの現実が違った」

    [turn]
    この会社は、
    都合の悪いことを
    言うだろうか。

    [end]
    毎週火曜日
    プロフィールのリンクから

- 改行はそのまま反映されます。**1行は15文字以内**を目安に、自分で改行してください
- 行頭に `*` を付けると、その行だけ朱色になります
- [cover] の後ろに書いた文字は、ファイル名やメモ用（画像には出ません）
"""
import sys, os, re
from PIL import Image, ImageDraw, ImageFont

W, H = 1080, 1350
MARGIN = 96

PAPER   = (244, 246, 244)
INK     = (21, 32, 29)
MUTED   = (92, 107, 102)
RULE    = (220, 226, 222)
SHU     = (169, 58, 34)
AI      = (28, 90, 85)
AI_BG   = (230, 240, 238)

MINCHO = "/usr/share/fonts/opentype/ipafont-mincho/ipamp.ttf"
GOTHIC = "/usr/share/fonts/opentype/ipafont-gothic/ipagp.ttf"
LOGO   = os.path.join(os.path.dirname(__file__), "..", "assets", "logo.jpg")

SERIES = "人事の失敗図鑑"
BYLINE = "元管理者Ns"


def font(path, size):
    return ImageFont.truetype(path, size)


def text_size(draw, s, f):
    if not s:
        return (0, 0)
    box = draw.textbbox((0, 0), s, font=f)
    return (box[2] - box[0], box[3] - box[1])


def units(lines):
    """空行は0.5行分として、必要な行数を返す"""
    return sum(0.5 if not l.strip() else 1.0 for l in lines)


def fit_size(draw, lines, path, max_w, max_h, start=88, floor=34, lead=1.7):
    """行が枠に収まる最大のフォントサイズを返す"""
    n = units(lines)
    size = start
    while size > floor:
        f = font(path, size)
        lh = size * lead
        widest = max((text_size(draw, l.lstrip('*').strip(), f)[0]
                      for l in lines if l.strip()), default=0)
        if widest <= max_w and lh * n <= max_h:
            return size
        size -= 2
    return floor


def draw_lines(d, lines, f, x, y, lh, color, accent_color):
    for ln in lines:
        if not ln.strip():
            y += lh * 0.5
            continue
        acc = ln.startswith("*")
        d.text((x, y), ln[1:].strip() if acc else ln, font=f,
               fill=accent_color if acc else color)
        y += lh
    return y


def draw_footer(draw, idx, total, dark=False):
    c = MUTED if not dark else (150, 163, 158)
    f = font(GOTHIC, 26)
    y = H - MARGIN + 12
    draw.line([(MARGIN, y - 26), (W - MARGIN, y - 26)],
              fill=RULE if not dark else (58, 68, 64), width=1)
    draw.text((MARGIN, y), SERIES, font=f, fill=c)
    num = f"{idx:02d} / {total:02d}"
    w, _ = text_size(draw, num, f)
    draw.text((W - MARGIN - w, y), num, font=f, fill=c)


def render_cover(lines, idx, total):
    img = Image.new("RGB", (W, H), PAPER)
    d = ImageDraw.Draw(img)

    # ロゴ（白背景を地色になじませる）
    logo_bottom = MARGIN
    if os.path.exists(LOGO):
        logo = Image.open(LOGO).convert("RGB")
        px = logo.load()
        for yy in range(logo.height):
            for xx in range(logo.width):
                r, g, b = px[xx, yy]
                if r > 232 and g > 232 and b > 232:
                    px[xx, yy] = PAPER
        lw = int((W - MARGIN * 2) * 0.82)
        lh = int(logo.height * lw / logo.width)
        logo = logo.resize((lw, lh), Image.LANCZOS)
        img.paste(logo, (MARGIN - 8, MARGIN + 10))
        logo_bottom = MARGIN + 10 + lh

    top = logo_bottom + 60
    avail_h = (H - MARGIN - 90) - top
    size = fit_size(d, lines, MINCHO, W - MARGIN * 2, avail_h, start=104, floor=44, lead=1.65)
    f = font(MINCHO, size)
    lh = size * 1.65
    y = top + (avail_h - lh * units(lines)) / 2
    draw_lines(d, lines, f, MARGIN, y, lh, INK, SHU)

    draw_footer(d, idx, total)
    return img


def render_body(lines, idx, total, kind="body"):
    bg = AI_BG if kind == "turn" else PAPER
    img = Image.new("RGB", (W, H), bg)
    d = ImageDraw.Draw(img)

    if kind == "turn":
        d.rectangle([(0, 0), (14, H)], fill=AI)

    top = MARGIN + 40
    avail_h = (H - MARGIN - 90) - top
    size = fit_size(d, lines, MINCHO, W - MARGIN * 2, avail_h, start=84, floor=36, lead=1.85)
    f = font(MINCHO, size)
    lh = size * 1.85
    y = top + (avail_h - lh * units(lines)) / 2
    base = AI if kind == "turn" else INK
    draw_lines(d, lines, f, MARGIN, y, lh, base, SHU)

    draw_footer(d, idx, total)
    return img


def render_end(lines, idx, total):
    img = Image.new("RGB", (W, H), INK)
    d = ImageDraw.Draw(img)

    main = [l for l in lines if not l.startswith("*")]
    cta = [l[1:].strip() for l in lines if l.startswith("*")]
    while main and not main[-1].strip():
        main.pop()

    top = MARGIN + 40
    avail_h = (H - MARGIN - 350) - top
    size = fit_size(d, main, MINCHO, W - MARGIN * 2, avail_h, start=84, floor=36, lead=1.85)
    f = font(MINCHO, size)
    lh = size * 1.85
    y = top + (avail_h - lh * units(main)) / 2
    draw_lines(d, main, f, MARGIN, y, lh, PAPER, (226, 121, 94))

    # CTA
    cy = H - MARGIN - 300
    if cta:
        fc = font(GOTHIC, 40)
        d.line([(MARGIN, cy - 26), (MARGIN + 90, cy - 26)], fill=(226, 121, 94), width=3)
        for c in cta:
            d.text((MARGIN, cy), c, font=fc, fill=(226, 121, 94))
            cy += 58

    fb = font(GOTHIC, 34)
    d.text((MARGIN, H - MARGIN - 104), BYLINE, font=fb, fill=PAPER)
    fs = font(GOTHIC, 27)
    d.text((MARGIN, H - MARGIN - 60), "訪問看護ステーションの人事", font=fs, fill=(150, 163, 158))

    draw_footer(d, idx, total, dark=True)
    return img


def trim(lines):
    while lines and not lines[0].strip():
        lines.pop(0)
    while lines and not lines[-1].strip():
        lines.pop()
    return lines


def parse(path):
    slides, cur, kind = [], [], None
    for raw in open(path, encoding="utf-8").read().split("\n"):
        m = re.match(r"^\[(cover|body|turn|end)\]", raw.strip())
        if m:
            if kind:
                slides.append((kind, trim(cur)))
            kind, cur = m.group(1), []
            continue
        if kind is not None:
            cur.append(raw.rstrip())
    if kind:
        slides.append((kind, trim(cur)))
    return slides


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    src = sys.argv[1]
    name = os.path.splitext(os.path.basename(src))[0]
    outdir = os.path.join(os.path.dirname(__file__), "out", name)
    os.makedirs(outdir, exist_ok=True)

    slides = parse(src)
    total = len(slides)
    for i, (kind, lines) in enumerate(slides, 1):
        if kind == "cover":
            img = render_cover(lines, i, total)
        elif kind == "end":
            img = render_end(lines, i, total)
        else:
            img = render_body(lines, i, total, kind)
        out = os.path.join(outdir, f"{i:02d}.png")
        img.save(out, quality=95)
        print(f"  {out}  [{kind}]")
    print(f"\n{total}枚を {outdir} に出力しました（1080×1350）")


if __name__ == "__main__":
    main()
