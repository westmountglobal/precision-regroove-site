#!/usr/bin/env python3
"""Generate favicon, OG image, and FR/EN regroove GIFs for Precision Regroove."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageOps
import math, subprocess, shutil, os

ROOT = Path("/workspace/boloten-tires")
ANIM = ROOT / "img/anim"
ICON = ROOT / "img"
ANIM.mkdir(parents=True, exist_ok=True)

BG = (18, 20, 23)
SURFACE = (28, 32, 38)
TEXT = (244, 241, 234)
MUTED = (200, 195, 184)
ACCENT = (255, 196, 0)
INK = (18, 20, 23)
RUBBER = (28, 28, 30)
RUBBER_HI = (48, 48, 52)
GROOVE = (14, 14, 16)
RIM = (255, 196, 0)
STEEL = (90, 90, 96)

FONT_DISP = "/usr/share/fonts/truetype/liberation/LiberationSansNarrow-Bold.ttf"
FONT_BODY = "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"
FONT_BODY_B = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"

def font(path, size):
    return ImageFont.truetype(path, size)

def rounded_rect(draw, box, r, fill, outline=None, width=1):
    draw.rounded_rectangle(box, radius=r, fill=fill, outline=outline, width=width)

# ---------- Favicon / app icons ----------
def make_icons():
    def mark(size, pad_ratio=0.14):
        im = Image.new("RGB", (size, size), BG)
        d = ImageDraw.Draw(im)
        pad = int(size * pad_ratio)
        # tire ring
        d.ellipse((pad, pad, size-pad, size-pad), fill=RUBBER, outline=ACCENT, width=max(2, size//24))
        inner = pad + int(size * 0.22)
        d.ellipse((inner, inner, size-inner, size-inner), fill=BG, outline=ACCENT, width=max(1, size//32))
        # three groove cuts at bottom of tire
        cx = cy = size/2
        rad = (size - 2*pad) / 2 - size*0.04
        for ang in (-25, 0, 25):
            a = math.radians(90 + ang)
            x1 = cx + (rad-size*0.02) * math.cos(a)
            y1 = cy + (rad-size*0.02) * math.sin(a)
            x2 = cx + (rad+size*0.015) * math.cos(a)
            y2 = cy + (rad+size*0.015) * math.sin(a)
            d.line((x1, y1, x2, y2), fill=ACCENT, width=max(2, size//16))
        return im

    svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="10" fill="#121417"/>
  <circle cx="32" cy="32" r="22" fill="#1c1c1e" stroke="#FFC400" stroke-width="3"/>
  <circle cx="32" cy="32" r="10" fill="#121417" stroke="#FFC400" stroke-width="2"/>
  <path d="M20 48 L23 53" stroke="#FFC400" stroke-width="3" stroke-linecap="round"/>
  <path d="M32 50 L32 55" stroke="#FFC400" stroke-width="3" stroke-linecap="round"/>
  <path d="M44 48 L41 53" stroke="#FFC400" stroke-width="3" stroke-linecap="round"/>
</svg>
'''
    (ICON / "favicon.svg").write_text(svg)
    for size, name in [(32, "favicon-32.png"), (180, "apple-touch-icon.png"), (192, "icon-192.png"), (512, "icon-512.png")]:
        mark(size).save(ICON / name, "PNG")
    # ico from 32 and 16
    mark(32).resize((16,16), Image.Resampling.LANCZOS).save(ICON / "favicon.ico", sizes=[(16,16),(32,32)])
    print("icons ok")

# ---------- OG image ----------
def make_og():
    W, H = 1200, 630
    base = Image.open("/tmp/og-base.jpg").convert("RGB").resize((W, H), Image.Resampling.LANCZOS)
    # darken left side for type
    overlay = Image.new("RGB", (W, H), BG)
    # gradient mask
    mask = Image.new("L", (W, H), 0)
    md = ImageDraw.Draw(mask)
    for x in range(W):
        # stronger dark on left 70%
        if x < 720:
            v = 200
        else:
            v = int(200 * (1 - (x-720)/480))
            v = max(40, v)
        md.line((x, 0, x, H), fill=v)
    img = Image.composite(Image.blend(base, overlay, 0.55), base, mask)
    # extra left vignette
    img = Image.blend(img, overlay, 0.18)
    d = ImageDraw.Draw(img)
    # yellow accent bar
    d.rectangle((0, 0, 16, H), fill=ACCENT)
    # wordmark
    f_name = font(FONT_DISP, 86)
    f_tag = font(FONT_BODY, 28)
    f_small = font(FONT_BODY, 20)
    name = "Precision Regroove"
    # measure
    d.text((72, 200), name, font=f_name, fill=ACCENT)
    tag = "Regroovage de pneus  ·  Camions lourds et machinerie  ·  Montréal"
    d.text((72, 310), tag, font=f_tag, fill=TEXT)
    d.rectangle((72, 370, 200, 376), fill=ACCENT)
    d.text((72, 400), "Tire grooving  ·  Greater Montréal", font=f_small, fill=MUTED)
    out_jpg = ICON / "og.jpg"
    out_webp = ICON / "og.webp"
    img.save(out_jpg, "JPEG", quality=86, optimize=True, progressive=True)
    img.save(out_webp, "WEBP", quality=80, method=6)
    print("og", out_jpg.stat().st_size, out_webp.stat().st_size)

# ---------- GIF animation ----------
def draw_tire(d, cx, cy, r_out, r_in, groove_depth, blade=None, n_lugs=18):
    # outer rubber
    d.ellipse((cx-r_out, cy-r_out, cx+r_out, cy+r_out), fill=RUBBER, outline=(20,20,22), width=2)
    # lugs around circumference
    for i in range(n_lugs):
        a0 = math.radians(i * 360/n_lugs - 90)
        a1 = math.radians((i+0.72) * 360/n_lugs - 90)
        # worn vs recut: groove_depth 0..1 extends lug and adds a mid cut
        extend = 10 + 16 * groove_depth
        pts = []
        for a, rad in ((a0, r_out-4), (a0, r_out+extend), (a1, r_out+extend), (a1, r_out-4)):
            pts.append((cx + rad*math.cos(a), cy + rad*math.sin(a)))
        d.polygon(pts, fill=RUBBER_HI if i%2==0 else (40,40,44))
        if groove_depth > 0.15:
            mid = (a0+a1)/2
            cut = 6 + 10*groove_depth
            x1 = cx + (r_out-2)*math.cos(mid)
            y1 = cy + (r_out-2)*math.sin(mid)
            x2 = cx + (r_out+extend-2)*math.cos(mid)
            y2 = cy + (r_out+extend-2)*math.sin(mid)
            d.line((x1,y1,x2,y2), fill=GROOVE, width=max(3, int(5*groove_depth)))
    # sidewall
    d.ellipse((cx-r_out+8, cy-r_out+8, cx+r_out-8, cy+r_out-8), outline=(60,60,64), width=3)
    # rim
    d.ellipse((cx-r_in, cy-r_in, cx+r_in, cy+r_in), fill=(40, 38, 32), outline=RIM, width=6)
    d.ellipse((cx-r_in+18, cy-r_in+18, cx+r_in-18, cy+r_in-18), fill=BG, outline=STEEL, width=3)
    # hub
    d.ellipse((cx-14, cy-14, cx+14, cy+14), fill=RIM)
    # lug nuts
    for i in range(6):
        a = math.radians(i*60)
        x, y = cx + 32*math.cos(a), cy + 32*math.sin(a)
        d.ellipse((x-4,y-4,x+4,y+4), fill=STEEL)
    # blade
    if blade is not None:
        ang, cutting = blade
        a = math.radians(ang - 90)
        # blade sits just outside the tread
        rad = r_out + 10 + 16*(cutting or groove_depth)
        bx = cx + rad*math.cos(a)
        by = cy + rad*math.sin(a)
        # triangle pointing inward
        nx, ny = -math.cos(a), -math.sin(a)
        tx, ty = -ny, nx
        p1 = (bx + 28*nx, by + 28*ny)
        p2 = (bx + 16*tx, by + 16*ty)
        p3 = (bx - 16*tx, by - 16*ty)
        d.polygon([p1,p2,p3], fill=ACCENT)
        # handle
        hx, hy = bx - 18*nx, by - 18*ny
        d.line((bx-8*nx, by-8*ny, hx-22*nx, hy-22*ny), fill=(220, 180, 40), width=8)

def render_frame(w, h, groove, blade, caption, sub, brand, step_label):
    im = Image.new("RGB", (w, h), BG)
    d = ImageDraw.Draw(im)
    # top yellow bar
    d.rectangle((0, 0, w, 6), fill=ACCENT)
    # caption
    f_cap = font(FONT_DISP, 36)
    f_sub = font(FONT_BODY, 18)
    f_brand = font(FONT_DISP, 20)
    # step pill
    if step_label:
        f_step = font(FONT_BODY_B, 14)
        tw = d.textlength(step_label, font=f_step)
        pill = (24, 22, 24+tw+20, 48)
        rounded_rect(d, pill, 4, ACCENT)
        d.text((34, 26), step_label, font=f_step, fill=INK)
    d.text((24, 60), caption, font=f_cap, fill=TEXT)
    if sub:
        d.text((24, 106), sub, font=f_sub, fill=MUTED)
    # tire
    draw_tire(d, w//2 + 90, h//2 + 36, r_out=110, r_in=58, groove_depth=groove, blade=blade)
    # brand footer
    d.rectangle((0, h-44, w, h), fill=(12, 13, 15))
    d.rectangle((0, h-44, w, h-42), fill=ACCENT)
    d.text((24, h-34), brand, font=f_brand, fill=ACCENT)
    return im

def make_gifs():
    W, H = 640, 400
    brand = "Precision Regroove"
    copies = {
        "fr": {
            "steps": [
                ("01", "Pneu usé", "Sculptures peu profondes"),
                ("02", "Regroovage", "On recreuse le dessin"),
                ("03", "Sculptures recreusées", "Sans remplacer le pneu"),
                ("04", "Traction rétablie", "À une fraction du coût"),
            ]
        },
        "en": {
            "steps": [
                ("01", "Worn tread", "Shallow grooves"),
                ("02", "Grooving", "The pattern is recut"),
                ("03", "Tread recut", "Without a new tire"),
                ("04", "Traction restored", "At a fraction of the cost"),
            ]
        },
    }
    tmp = Path("/tmp/regroove-frames")
    if tmp.exists():
        shutil.rmtree(tmp)
    for lang, data in copies.items():
        ldir = tmp / lang
        ldir.mkdir(parents=True)
        frames_meta = []  # (path, duration_centiseconds later)
        # timeline: 8 hold worn, 4 tool enter, 18 cutting (groove 0->1), 8 hold recut, 10 hold final
        steps = data["steps"]
        seq = []
        # worn hold, no blade
        for i in range(8):
            seq.append((0.0, None, steps[0]))
        # tool appears at angle 200
        for i in range(4):
            seq.append((0.0, (200, 0), steps[1]))
        # cut from angle 200 to 200+360 (full lap) while groove goes 0->1
        ncut = 20
        for i in range(ncut):
            t = (i+1)/ncut
            ang = 200 + 360 * t
            seq.append((t, (ang, t), steps[1] if t < 0.85 else steps[2]))
        # hold finished, blade leaves
        for i in range(3):
            seq.append((1.0, (200+360, 1), steps[2]))
        for i in range(8):
            seq.append((1.0, None, steps[2]))
        for i in range(10):
            seq.append((1.0, None, steps[3]))

        paths = []
        for i, (groove, blade, step) in enumerate(seq):
            im = render_frame(W, H, groove, blade, step[1], step[2], brand, step[0])
            p = ldir / f"f{i:03d}.png"
            im.save(p)
            paths.append(p)
        # poster = last frame and first frame
        Image.open(paths[0]).save(ANIM / f"regroove-{lang}-poster.jpg", "JPEG", quality=86, optimize=True)
        Image.open(paths[-1]).convert("RGB").save(ANIM / f"regroove-{lang}-end.jpg", "JPEG", quality=86, optimize=True)
        # ffmpeg palette gif
        out = ANIM / f"regroove-{lang}.gif"
        pal = ldir / "pal.png"
        # 10 fps
        subprocess.check_call([
            "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
            "-framerate", "10", "-i", str(ldir / "f%03d.png"),
            "-vf", "palettegen=max_colors=64:stats_mode=diff", str(pal)
        ])
        subprocess.check_call([
            "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
            "-framerate", "10", "-i", str(ldir / "f%03d.png"), "-i", str(pal),
            "-lavfi", "paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle",
            "-loop", "0", str(out)
        ])
        # if still huge, try again with smaller scale? report size
        kb = out.stat().st_size/1024
        print(f"gif {lang}: {kb:.0f}KB, {len(paths)} frames")
        if kb > 500:
            # shrink
            out2 = ANIM / f"regroove-{lang}.gif"
            subprocess.check_call([
                "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
                "-framerate", "10", "-i", str(ldir / "f%03d.png"), "-i", str(pal),
                "-lavfi", "fps=8,scale=560:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=3",
                "-loop", "0", str(out2)
            ])
            print(f"  recompressed {out2.stat().st_size/1024:.0f}KB")

if __name__ == "__main__":
    make_icons()
    make_og()
    make_gifs()
    print("done")
