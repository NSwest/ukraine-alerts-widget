"""Inlines geo.js into the widget source -> alerts-map.widget/index.jsx"""
import sys
src, geo, out = sys.argv[1:4]
s = open(src, encoding='utf-8').read()
g = open(geo, encoding='utf-8').read().replace('export const GEO', 'const GEO')
assert '/*__GEO__*/' in s
open(out, 'w', encoding='utf-8').write(s.replace('/*__GEO__*/', g.strip()))
