import json, sys
from PIL import Image, ImageDraw
frames = json.load(open(sys.argv[1]))
S = 4; W, H = 128 * S, 32 * S
cols = 2; rows = (len(frames) + cols - 1) // cols
img = Image.new('RGB', (cols * (W + 10) + 10, rows * (H + 24) + 10), (20, 20, 20))
d = ImageDraw.Draw(img)
for k, f in enumerate(frames):
    ox = 10 + (k % cols) * (W + 10); oy = 10 + (k // cols) * (H + 24)
    d.text((ox, oy), f['name'], fill=(200, 200, 200))
    oy += 12
    for i, v in enumerate(f['buf']):
        x, y = i % 128, i // 128
        c = (int(40 + 215 * v / 15), int(15 + 120 * v / 15), int(5 + 30 * v / 15)) if v else (30, 12, 4)
        d.rectangle([ox + x * S, oy + y * S, ox + x * S + S - 2, oy + y * S + S - 2], fill=c)
img.save(sys.argv[2])
