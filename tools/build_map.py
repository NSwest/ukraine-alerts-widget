"""Генерує спрощені SVG-контури областей України для віджета.

Джерело геометрії: https://github.com/EugeneBorshch/ukraine_geojson (OpenStreetMap).
Використання:
    pip install shapely
    curl -LO https://raw.githubusercontent.com/EugeneBorshch/ukraine_geojson/master/UA_FULL_Ukraine.geojson
    python3 tools/build_map.py > map.json
Результат вставляється в index.jsx як константа MAP.
"""
import json, math, sys
from shapely.geometry import shape

d = json.load(open('UA_FULL_Ukraine.geojson'))
k = math.cos(math.radians(48.5))
minx, maxx, miny, maxy = 22.1, 40.3, 44.3, 52.4
W = 600
s = W / ((maxx - minx) * k)
H = round((maxy - miny) * s)

def P(lon, lat):
    return ((lon - minx) * k * s, (maxy - lat) * s)

out = {}
for f in d['features']:
    g = shape(f['geometry']).simplify(0.012, preserve_topology=True)
    path = ''
    for ring in [g.exterior] + list(g.interiors):
        path += 'M' + 'L'.join(f'{x:.1f},{y:.1f}' for x, y in (P(*c) for c in ring.coords)) + 'Z'
    c = g.representative_point()
    cx, cy = P(c.x, c.y)
    out[f['properties']['name']] = {'d': path, 'c': [round(cx), round(cy)]}

# міста зі спеціальним статусом — кружечками
for name, (lon, lat) in {'м. Київ': (30.52, 50.45), 'Севастополь': (33.52, 44.6)}.items():
    x, y = P(lon, lat)
    out[name] = {'circle': [round(x, 1), round(y, 1)]}

json.dump({'W': W, 'H': H, 'regions': out}, sys.stdout, ensure_ascii=False, separators=(',', ':'))
