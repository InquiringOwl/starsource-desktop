#!/usr/bin/env python3
"""Regenerate tests/fixtures/swetest.json with the NATIVE swetest built from vendor/swisseph:
     gcc -O2 -o /tmp/swetest vendor/swisseph/{swetest,sweph,swephlib,swedate,swehouse,swejpl,swemmoon,swemplan,swecl,swehel}.c -lm -ldl
     python3 tools/make-fixtures.py /tmp/swetest
The WASM engine must reproduce these numbers (tests/astro.test.js, tolerance 1e-6 degrees)."""
import subprocess, json, sys, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SWETEST = sys.argv[1] if len(sys.argv) > 1 else '/tmp/swetest'
E = '-edir' + os.path.join(ROOT, 'app', 'ephe')
cases = [("15.5.1990", "14:30:00", -74.006, 40.7128), ("1.1.2000", "0:00:00", 0, 51.4769), ("21.6.1969", "20:17:40", -95.3698, 29.7604),
         ("29.2.1824", "3:05:59", 12.4964, 41.9028), ("12.10.2026", "18:00:00", -118.2437, 34.0522), ("3.3.1955", "9:09:09", 151.2093, -33.8688),
         ("30.12.2199", "23:59:59", -21.94, 64.14)]
run = lambda args: subprocess.run([SWETEST, E] + args, capture_output=True, text=True).stdout
out = []
for d, t, lon, lat in cases:
    c = {"date": d, "ut": t, "lon": lon, "lat": lat, "bodies": [], "houses": {}}
    for line in run(['-b' + d, '-ut' + t, '-p0123456789mtAFDGHIJ', '-fPls', '-head']).strip().split('\n'):
        v = line[16:].split(); c['bodies'].append([line[:16].strip(), float(v[0]), float(v[1])])
    for h in "PKRCWAOBMTXHVUYG":
        r = run(['-b' + d, '-ut' + t, '-house%s,%s,%s' % (lon, lat, h), '-p', '-fPl', '-head']).strip().split('\n')
        c['houses'][h] = [float(l[16:].split()[0]) for l in r if l.startswith('house')] + [float(l[16:].split()[0]) for l in r if l.startswith('Ascendant')]
    c['lahiri'] = [float(l[16:].split()[0]) for l in run(['-b' + d, '-ut' + t, '-sid1', '-p0145', '-fPl', '-head']).strip().split('\n')]
    out.append(c)
json.dump(out, open(os.path.join(ROOT, 'tests', 'fixtures', 'swetest.json'), 'w'), indent=0)
print('wrote', len(out), 'cases')
