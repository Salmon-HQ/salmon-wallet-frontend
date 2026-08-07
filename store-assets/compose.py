#!/usr/bin/env python3
"""Composes store screenshot frames from raw device captures.

Replaces the Next.js editor the app-store-screenshots skill scaffolds: the frames
are background + device + caption, which PIL renders deterministically from the
deck below. Re-running reproduces byte-identical output, and the deck is the whole
recipe — no 400 MB of template to keep in sync.

    python3 store-assets/compose.py            # every store
    python3 store-assets/compose.py play       # one store
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
FONTS = ROOT / "fonts"
SRC = ROOT / "source"

CORAL_TOP, CORAL_BOT = (0xFF, 0x81, 0x70), (0xFF, 0x5C, 0x45)
NAVY_TOP, NAVY_BOT = (0x16, 0x1C, 0x2D), (0x10, 0x13, 0x1C)
WHITE = (0xFC, 0xFC, 0xFC)

# Каждый frame: (capture, eyebrow, headline, background)
DECK = [
    # (captura, eyebrow, headline, fondo, stores)
    ("01-home",         "OPEN-SOURCE. SELF-CUSTODIAL.", "Your keys.\nYour coins.",         "coral", None),
    ("02-send",         None, "Send to any wallet\nor .sol name",                          "navy",  None),
    ("07-swap",         None, "Swap and bridge,\nbuilt in.",                               "coral", None),
    ("08-swap-review",  None, "See every fee\nbefore you sign",                            "navy",  None),
    ("03-transactions", None, "Your assets and activity,\none view.",                      "coral", None),
    ("04-collectibles", None, "Your NFTs,\nfront and center",                              "navy",  None),
    ("05-nft-detail",   None, "Every collectible,\nin detail",                             "coral", None),
    # Play admite 8; token-info entra solo en App Store, que admite 10.
    ("06-token-info",   None, "Live prices\nfor every token",                              "navy",  ("app-store",)),
    ("09-about",        None, "If you can\u2019t verify it,\nyou don\u2019t own it.",     "coral", None),
]

CWS_DECK = [
    ("01-home",         "Your whole portfolio,\none click away",  "coral"),
    ("02-swap",         "Swap without\nleaving the tab",          "navy"),
    ("04-transactions", "Every transaction,\nin plain language",  "coral"),
    ("03-collectibles", "Your NFTs,\nfront and center",           "navy"),
    ("05-settings",     "Connect to dApps.\nSign with clarity.",  "coral"),
]

STORES = {
    # name:        (canvas,        source dir,      output dir)
    "play":        ((1080, 1920), "android-staged", "play/phone"),
    "app-store":   ((1320, 2868), "ios-staged",     "app-store/iphone-6.9"),
    # Apaisado: la captura web es una columna de 430x800, asi que va a la
    # derecha y el caption ocupa la mitad izquierda — meterla centrada en un
    # lienzo horizontal dejaria dos franjas vacias enormes.
    "chrome-web-store": ((1280, 800), "web-staged/cropped", "chrome-web-store/screenshots"),
}


def gradient(size, top, bot):
    w, h = size
    im = Image.new("RGB", size)
    d = ImageDraw.Draw(im)
    for y in range(h):
        t = y / (h - 1)
        d.line([(0, y), (w, y)], fill=tuple(round(top[i] + (bot[i] - top[i]) * t) for i in range(3)))
    return im


def scallops(size, alpha):
    """The brand's fish-scale rows, drawn at the scale of the feature graphic.

    Large enough to still read at a store thumbnail; faint enough never to
    compete with the headline.
    """
    w, h = size
    im = Image.new("RGBA", size, (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    r = round(w * 0.085)
    y, row = -r, 0
    while y < h + r:
        x = -r if row % 2 else 0
        while x < w + r:
            d.arc([x - r, y - r, x + r, y + r], 180, 360, fill=(255, 255, 255, alpha), width=max(2, r // 26))
            x += 2 * r
        y += r
        row += 1
    return im


def rounded_device(shot, width, radius_ratio=0.075):
    """The capture inside a rounded screen with a hairline edge and soft shadow."""
    ratio = shot.height / shot.width
    w, h = width, round(width * ratio)
    body = shot.resize((w, h), Image.LANCZOS).convert("RGBA")
    r = round(w * radius_ratio)

    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, w - 1, h - 1], radius=r, fill=255)
    body.putalpha(mask)

    pad = round(w * 0.09)
    canvas = Image.new("RGBA", (w + pad * 2, h + pad * 2), (0, 0, 0, 0))
    shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle(
        [pad, pad + round(pad * 0.35), pad + w, pad + h + round(pad * 0.35)], radius=r, fill=(0, 0, 0, 110)
    )
    from PIL import ImageFilter
    canvas.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(pad * 0.45)))
    canvas.alpha_composite(body, (pad, pad))
    ImageDraw.Draw(canvas).rounded_rectangle(
        [pad, pad, pad + w - 1, pad + h - 1], radius=r, outline=(255, 255, 255, 40), width=max(1, w // 400)
    )
    return canvas


def draw_caption(im, eyebrow, headline, canvas_w, top_y):
    d = ImageDraw.Draw(im)
    unit = canvas_w
    y = top_y
    if eyebrow:
        f = ImageFont.truetype(str(FONTS / "DMSans-Medium.ttf"), round(unit * 0.026))
        w = d.textbbox((0, 0), eyebrow, font=f)[2]
        d.text(((canvas_w - w) / 2, y), eyebrow, font=f, fill=WHITE + (0,) if False else WHITE)
        y += round(unit * 0.055)
    f = ImageFont.truetype(str(FONTS / "DMSans-Bold.ttf"), round(unit * 0.075))
    for line in headline.split("\n"):
        bbox = d.textbbox((0, 0), line, font=f)
        d.text(((canvas_w - bbox[2]) / 2, y), line, font=f, fill=WHITE)
        y += round(unit * 0.088)
    return y


def compose_landscape(store):
    (cw, ch), src_dir, out_dir = STORES[store]
    src, out = SRC / src_dir, ROOT / out_dir
    out.mkdir(parents=True, exist_ok=True)
    made = []
    for i, (capture, headline, bg) in enumerate(CWS_DECK, start=1):
        shot = src / f"{capture}.png"
        if not shot.exists():
            print(f"  !! falta {shot.name}"); continue
        top, bot = (CORAL_TOP, CORAL_BOT) if bg == "coral" else (NAVY_TOP, NAVY_BOT)
        frame = gradient((cw, ch), top, bot).convert("RGBA")
        frame.alpha_composite(scallops((cw, ch), 26 if bg == "coral" else 20))

        gap = round(ch * 0.075)
        device = rounded_device(Image.open(shot), round(cw * 0.30), radius_ratio=0.055)
        if device.height > ch - gap:
            sc = (ch - gap) / device.height
            device = device.resize((round(device.width * sc), round(device.height * sc)), Image.LANCZOS)
        dx = cw - device.width - round(cw * 0.07)
        frame.alpha_composite(device, (dx, (ch - device.height) // 2))

        d = ImageDraw.Draw(frame)
        f = ImageFont.truetype(str(FONTS / "DMSans-Bold.ttf"), round(cw * 0.052))
        lines = headline.split("\n")
        lh = round(cw * 0.062)
        y = (ch - lh * len(lines)) // 2
        for line in lines:
            d.text((round(cw * 0.075), y), line, font=f, fill=WHITE)
            y += lh
        dest = out / f"{i:02d}-{capture.split('-', 1)[1]}.png"
        frame.convert("RGB").save(dest); made.append(dest.name)
    print(f"{store}: {len(made)} frames {cw}x{ch} -> {out.relative_to(ROOT.parent)}")
    return made


def compose(store):
    if store == "chrome-web-store":
        return compose_landscape(store)
    (cw, ch), src_dir, out_dir = STORES[store]
    src = SRC / src_dir
    out = ROOT / out_dir
    out.mkdir(parents=True, exist_ok=True)
    made = []
    n = 0
    for capture, eyebrow, headline, bg, only in DECK:
        if only and store not in only:
            continue
        n += 1
        shot_path = src / f"{capture}.png"
        if not shot_path.exists():
            print(f"  !! falta {shot_path.name}, salteado")
            continue
        top, bot = (CORAL_TOP, CORAL_BOT) if bg == "coral" else (NAVY_TOP, NAVY_BOT)
        frame = gradient((cw, ch), top, bot).convert("RGBA")
        frame.alpha_composite(scallops((cw, ch), 26 if bg == "coral" else 20))

        caption_top = round(ch * 0.055)
        lines = len(headline.split("\n")) + (1 if eyebrow else 0)
        caption_bottom = caption_top + round(cw * 0.088) * lines + (round(cw * 0.02) if eyebrow else 0)

        # Contenido, con el MISMO aire arriba y abajo: el device no toca el borde
        # inferior. Se escala a la altura disponible entre el caption y el piso
        # menos dos veces el gap, asi la separacion texto->device iguala la de
        # device->piso y el frame respira parejo.
        gap = round(ch * 0.042)
        avail_h = ch - caption_bottom - gap * 2
        device = rounded_device(Image.open(shot_path), round(cw * 0.60))
        if device.height > avail_h:
            scale = avail_h / device.height
            device = device.resize((round(device.width * scale), round(device.height * scale)), Image.LANCZOS)
        top = caption_bottom + gap + (avail_h - device.height) // 2
        frame.alpha_composite(device, ((cw - device.width) // 2, top))

        draw_caption(frame, eyebrow, headline, cw, caption_top)
        dest = out / f"{n:02d}-{capture.split('-', 1)[1]}.png"
        frame.convert("RGB").save(dest)
        made.append(dest.name)
    print(f"{store}: {len(made)} frames {cw}x{ch} -> {out.relative_to(ROOT.parent)}")
    return made


if __name__ == "__main__":
    for s in (sys.argv[1:] or STORES.keys()):
        compose(s)
