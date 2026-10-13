#!/bin/bash
# Rebuild app/engine/swisseph.wasm from vendor/swisseph (Swiss Ephemeris C source, AGPL) + web/engine/ss.c.
# Needs Zig (bundles clang + wasi-libc): `pip install ziglang` or download the wheel and unzip it, then ZIG=/path/to/zig.
# Emscripten is not used: the WASI build plus the tiny shim in web/engine/swe.js has no generated glue code.
set -e
cd "$(dirname "$0")/.."
ZIG=${ZIG:-$(python3 -c 'import ziglang,os;print(os.path.join(os.path.dirname(ziglang.__file__),"zig"))' 2>/dev/null || echo zig)}
S=vendor/swisseph
EXP=$(grep -o "ss_[a-z_0-9]*(" web/engine/ss.c | sort -u | tr -d '(' | sed 's/^/-Wl,--export=/' | tr '\n' ' ')
"$ZIG" cc -target wasm32-wasi -O2 -DNO_SWE_GLP -mexec-model=reactor -I$S web/engine/ss.c \
  $S/sweph.c $S/swephlib.c $S/swedate.c $S/swehouse.c $S/swejpl.c $S/swemmoon.c $S/swemplan.c $S/swecl.c $S/swehel.c \
  $EXP -o app/engine/swisseph.wasm
ls -la app/engine/swisseph.wasm
