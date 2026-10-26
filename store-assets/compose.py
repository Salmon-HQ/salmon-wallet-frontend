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
# The app's own font files, not a copy: the store frames and the product must
# never drift onto different cuts of the same typeface.
FONTS = ROOT.parent / "packages" / "assets" / "src" / "fonts"
SRC = ROOT / "source"

CORAL_TOP, CORAL_BOT = (0xFF, 0x81, 0x70), (0xFF, 0x5C, 0x45)
NAVY_TOP, NAVY_BOT = (0x16, 0x1C, 0x2D), (0x10, 0x13, 0x1C)
WHITE = (0xFC, 0xFC, 0xFC)
# White on a salmon fill measures 3.06:1 and is banned outright by DESIGN.md;
# neutral-1000 is the only legal ink there, at 6.50:1. Navy keeps white.
INK_ON_CORAL = (0x07, 0x09, 0x11)

# Each frame: (capture, eyebrow, headline, background). Captions count as
# listing metadata: no "exchange", "trade" or "order", no prices or awards.
HOME = ("01-home", "OPEN-SOURCE. SELF-CUSTODIAL.", "One wallet.\nOnly what you need.", "coral")
SWAP = ("02-swap", None, "Swap tokens.\nSee every cost first.", "navy")
PHONE_DECK = [
    HOME,
    SWAP,
    ("03-powerups", None, "Switch Powerups on\nwhen you need them", "coral"),
    ("04-payments", None, "Get paid\nwith a QR code", "navy"),
    ("05-send", None, "Send to any wallet\nor .sns name", "coral"),
    ("06-nfts", None, "Your NFTs,\nfront and center", "navy"),
]
# The U.K. listing must not show Swap: token detail takes its place, and the
# catalogue is the one captured with Swap switched off for the region.
UK_DECK = [
    HOME,
    ("07-token-info", None, "Live prices\nfor every token", "navy"),
    ("03-powerups-uk", None, "Switch Powerups on\nwhen you need them", "coral"),
    *PHONE_DECK[3:],
]
SEEKER_DECK = [
    HOME,
    ("02-seed-vault", None, "Your keys stay\nin Seed Vault", "navy"),
    ("03-mwa-connect", None, "Connect to dApps\nin one tap", "coral"),
    ("04-sign", None, "Know what you sign\nbefore you sign", "navy"),
    ("05-skr", None, "Your SKR staking,\nin one place", "coral"),
    ("06-swap", None, SWAP[2], "navy"),
]

CWS_DECK = [
    ("01-home",         "Your whole portfolio,\none click away",  "coral"),
    ("02-swap",         "Swap tokens.\nSee every cost first.",    "navy"),
    ("03-powerups",     "Switch Powerups on\nwhen you need them", "coral"),
    ("04-sign",         "Know what you sign\nbefore you sign",    "navy"),
    ("05-send",         "Send to any wallet\nor .sns name",       "coral"),
]

STORES = {
    # name:          (canvas,       source dir,       output dir,              deck)
    "play":          ((1080, 1920), "android-staged", "play/phone",            PHONE_DECK),
    "app-store":     ((1320, 2868), "ios-staged",     "app-store/iphone-6.9",  PHONE_DECK),
    "app-store-uk":  ((1320, 2868), "ios-staged",     "app-store/iphone-6.9-uk", UK_DECK),
    "dapp-store":    ((1080, 1920), "seeker-staged",  "dapp-store/screenshots", SEEKER_DECK),
    # Apaisado: la captura es el side panel (400x800), asi que va a la derecha
    # y el caption ocupa la mitad izquierda — centrada en un lienzo horizontal
    # dejaria dos franjas vacias enormes.
    "chrome-web-store": ((1280, 800), "extension-staged", "chrome-web-store/screenshots", CWS_DECK),
}


def fresh(out):
    """An output dir holding only this run's frames: two generations side by side ship a mixed set."""
    out.mkdir(parents=True, exist_ok=True)
    for old in out.glob("*.png"):
        old.unlink()


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


def draw_caption(im, eyebrow, headline, canvas_w, top_y, ink):
    d = ImageDraw.Draw(im)
    unit = canvas_w
    y = top_y
    if eyebrow:
        f = ImageFont.truetype(str(FONTS / "DMSans-SemiBold.ttf"), round(unit * 0.026))
        w = d.textbbox((0, 0), eyebrow, font=f)[2]
        d.text(((canvas_w - w) / 2, y), eyebrow, font=f, fill=ink)
        y += round(unit * 0.055)
    f = ImageFont.truetype(str(FONTS / "DMSans-Bold.ttf"), round(unit * 0.075))
    for line in headline.split("\n"):
        bbox = d.textbbox((0, 0), line, font=f)
        d.text(((canvas_w - bbox[2]) / 2, y), line, font=f, fill=ink)
        y += round(unit * 0.088)
    return y


def compose_landscape(store):
    (cw, ch), src_dir, out_dir, deck = STORES[store]
    src, out = SRC / src_dir, ROOT / out_dir
    fresh(out)
    made = []
    for i, (capture, headline, bg) in enumerate(deck, start=1):
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
            d.text((round(cw * 0.075), y), line, font=f, fill=INK_ON_CORAL if bg == "coral" else WHITE)
            y += lh
        dest = out / f"{i:02d}-{capture.split('-', 1)[1]}.png"
        frame.convert("RGB").save(dest); made.append(dest.name)
    print(f"{store}: {len(made)} frames {cw}x{ch} -> {out.relative_to(ROOT.parent)}")
    return made


def compose(store):
    if store == "chrome-web-store":
        return compose_landscape(store)
    (cw, ch), src_dir, out_dir, deck = STORES[store]
    src = SRC / src_dir
    out = ROOT / out_dir
    fresh(out)
    made = []
    n = 0
    for capture, eyebrow, headline, bg in deck:
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
        device = rounded_device(Image.open(shot_path), round(cw * 0.74))
        if device.height > avail_h:
            scale = avail_h / device.height
            device = device.resize((round(device.width * scale), round(device.height * scale)), Image.LANCZOS)
        top = caption_bottom + gap + (avail_h - device.height) // 2
        frame.alpha_composite(device, ((cw - device.width) // 2, top))

        draw_caption(frame, eyebrow, headline, cw, caption_top, INK_ON_CORAL if bg == "coral" else WHITE)
        dest = out / f"{n:02d}-{capture.split('-', 1)[1]}.png"
        frame.convert("RGB").save(dest)
        made.append(dest.name)
    print(f"{store}: {len(made)} frames {cw}x{ch} -> {out.relative_to(ROOT.parent)}")
    return made


if __name__ == "__main__":
    for s in (sys.argv[1:] or STORES.keys()):
        compose(s)
