"""Builds compact SVG geometry (oblasts, raions, hromadas) + gazetteer for the widget.
Inputs (in GEO dir): h_2500.geojson, r.geojson, o.geojson (mapshaper output from OCHA COD-AB),
UA.txt + alt/UA.txt (GeoNames). Output: geo.js (export const GEO = {...})."""
import json, math, sys, os, re
GEO = sys.argv[1]; OUT = sys.argv[2]
minx, maxx, miny, maxy = 22.1, 40.3, 44.3, 52.4
k = math.cos(math.radians(48.5)); W = 1000; s = W / ((maxx - minx) * k); H = round((maxy - miny) * s)
P = lambda lon, lat: ((lon - minx) * k * s, (maxy - lat) * s)

def rings(g):
    if g['type'] == 'Polygon': return g['coordinates']
    return [r for p in g['coordinates'] for r in p]

def enc(g):
    out = []
    for ring in rings(g):
        pts = [tuple(round(v) for v in P(*c)) for c in ring]
        ded = [pts[0]] + [p for i, p in enumerate(pts[1:], 1) if p != pts[i - 1]]
        if len(ded) < 3: continue
        x0, y0 = ded[0]; s_ = f'M{x0} {y0}l'; px, py = x0, y0; parts = []
        for x, y in ded[1:]:
            parts.append(f'{x-px} {y-py}'); px, py = x, y
        s_ += ' '.join(parts).replace(' -', '-') + 'z'
        out.append(s_)
    return ''.join(out)

def centroid(g):
    best = None
    for ring in rings(g):
        a = 0; cx = cy = 0
        for (x1, y1), (x2, y2) in zip(ring, ring[1:]):
            f = x1 * y2 - x2 * y1; a += f; cx += (x1 + x2) * f; cy += (y1 + y2) * f
        if a and (best is None or abs(a) > best[0]): best = (abs(a), cx / (3 * a), cy / (3 * a))
    return [round(v) for v in P(best[1], best[2])]

ld = lambda f: json.load(open(os.path.join(GEO, f)))['features']
obl = sorted(ld('o.geojson'), key=lambda f: f['properties']['adm1_pcode'])
oidx = {f['properties']['adm1_pcode']: i for i, f in enumerate(obl)}
NAMEFIX = {'Київ': 'м. Київ', 'Севастополь': 'м. Севастополь', 'Автономна Республіка Крим': 'Автономна Республіка Крим'}
O = []
for f in obl:
    n = f['properties']['adm1_name1']; n = NAMEFIX.get(n, n + ' область')
    O.append({'n': n, 'd': enc(f['geometry']), 'c': centroid(f['geometry'])})
ray = sorted(ld('r.geojson'), key=lambda f: f['properties']['adm2_pcode'])
ridx = {f['properties']['adm2_pcode']: i for i, f in enumerate(ray)}
R = [{'n': f['properties']['adm2_name1'], 'o': oidx[f['properties']['adm1_pcode']], 'd': enc(f['geometry'])} for f in ray]
hr = sorted(ld('h_2500.geojson'), key=lambda f: f['properties']['adm3_pcode'])
Hm = [{'n': f['properties']['adm3_name1'], 'r': ridx[f['properties']['adm2_pcode']], 'd': enc(f['geometry'])} for f in hr]

# --- gazetteer: settlements with Ukrainian names
uk = {}
for line in open(os.path.join(GEO, 'alt/UA.txt'), encoding='utf-8'):
    p = line.rstrip('\n').split('\t')
    if len(p) > 3 and p[2] == 'uk' and not (len(p) > 7 and p[7] == '1'):  # skip historic
        gid = p[1]; pref = len(p) > 4 and p[4] == '1'
        if gid not in uk or pref: uk[gid] = p[3]
from shapely.geometry import shape, Point
from shapely.strtree import STRtree
hpolys = [shape(f['geometry']) for f in hr]
tree = STRtree(hpolys)
def locate(lon, lat):
    pt = Point(lon, lat)
    for i in tree.query(pt):
        if hpolys[i].contains(pt): return int(i)
    return -1
places = {}
for line in open(os.path.join(GEO, 'UA.txt'), encoding='utf-8'):
    p = line.split('\t')
    if p[6] != 'P': continue
    pop = int(p[14] or 0)
    if pop < 1500: continue
    name = uk.get(p[0])
    if not name or not re.fullmatch(r"[А-ЯҐЄІЇа-яґєії'ʼ’\- ]+", name): continue
    name = name.replace('’', "'").replace('ʼ', "'")
    lat, lon = float(p[4]), float(p[5])
    if not (minx < lon < maxx and miny < lat < maxy): continue
    key = name.lower()
    h = locate(lon, lat)
    if h < 0: continue
    o = R[Hm[h]['r']]['o']
    x, y = P(lon, lat)
    places.setdefault(key, []).append([round(x), round(y), pop, o, h])
G = {}
for k, lst in sorted(places.items(), key=lambda kv: -max(v[2] for v in kv[1])):
    lst.sort(key=lambda v: -v[2]); G[k] = lst[:4]
data = {'W': W, 'H': H, 'O': O, 'R': R, 'Hm': Hm, 'G': G}
js = '// Згенеровано tools/build_geo.py — межі: OCHA COD-AB (CC BY-IGO), населені пункти: GeoNames (CC BY 4.0)\nexport const GEO = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n'
open(OUT, 'w').write(js)
print('W,H', W, H, 'obl', len(O), 'ray', len(R), 'hrom', len(Hm), 'places', len(G), 'bytes', len(js.encode()))
print('sizes', {k: len(json.dumps(data[k], ensure_ascii=False)) for k in ['O', 'R', 'Hm', 'G']})
