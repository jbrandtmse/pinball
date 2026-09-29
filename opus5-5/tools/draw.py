# Renders geometry JSON (from dumpgeom.mjs) to a PNG for layout debugging.
import json, sys, math
from PIL import Image, ImageDraw
src, out = sys.argv[1], sys.argv[2]
S = float(sys.argv[3]) if len(sys.argv) > 3 else 36
crop = None
if len(sys.argv) > 4: crop = [float(v) for v in sys.argv[4].split(',')]  # x0,y0,x1,y1 inches
g = json.load(open(src))
W, L = 20.25, 45
img = Image.new('RGB', (int(W*S)+1, int(L*S)+1), (18, 18, 28))
d = ImageDraw.Draw(img)
P = lambda x, y: (x*S, y*S)
for i in range(0, 46):
    d.line([P(0, i), P(W, i)], fill=(30, 30, 44) if i % 5 else (48, 48, 70))
for i in range(0, 21):
    d.line([P(i, 0), P(i, L)], fill=(30, 30, 44) if i % 5 else (48, 48, 70))
for p in g.get('paths', []):
    pts = [P(x, y) for x, y, z in p]
    d.line(pts, fill=(90, 60, 160), width=max(1, int(S*0.5)))
for ax, ay, bx, by, r, en, kick, gate in g['segs']:
    col = (220, 200, 120) if en else (80, 80, 80)
    if kick: col = (255, 80, 80)
    if gate: col = (80, 255, 255)
    w = max(1, int(2*r*S)) if r > 0 else 2
    d.line([P(ax, ay), P(bx, by)], fill=col, width=w)
    if r > 0:
        for (x, y) in ((ax, ay), (bx, by)):
            d.ellipse([P(x-r, y-r), P(x+r, y+r)], fill=col)
for x, y, r, kick in g['circs']:
    d.ellipse([P(x-r, y-r), P(x+r, y+r)], outline=(255, 90, 90) if kick else (240, 240, 240), width=2)
for cx, cy, r, a0, a1 in g['arcs']:
    d.arc([P(cx-r, cy-r), P(cx+r, cy+r)], math.degrees(a0), math.degrees(a1), fill=(200, 200, 255), width=2)
for f in g['flips']:
    d.polygon([P(x, y) for x, y in f], outline=(120, 255, 120), fill=(40, 90, 40))
for t in g['trig']:
    if 'c' in t:
        x, y, r = t['c']; d.ellipse([P(x-r, y-r), P(x+r, y+r)], outline=(80, 160, 255))
    else:
        ax, ay, bx, by = t['l']; d.line([P(ax, ay), P(bx, by)], fill=(80, 160, 255), width=2)
R = 0.53125
for tr in g.get('traces', []):
    col = tuple(tr.get('color', [255, 255, 0]))
    pts = [P(x, y) for x, y in tr['pts']]
    if len(pts) > 1: d.line(pts, fill=col, width=1)
    if tr.get('end'):
        x, y = tr['pts'][-1]; d.ellipse([P(x-R, y-R), P(x+R, y+R)], outline=col, width=2)
for b in g.get('balls', []):
    x, y = b; d.ellipse([P(x-R, y-R), P(x+R, y+R)], fill=(230, 230, 240))
if crop:
    img = img.crop((int(crop[0]*S), int(crop[1]*S), int(crop[2]*S), int(crop[3]*S)))
img.save(out)
