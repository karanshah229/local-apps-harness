#!/bin/bash
export EXPO_NO_TELEMETRY=1
export CI=1
export NODE_ENV=production
MOBILE_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MONOREPO_ROOT="$(cd "$MOBILE_ROOT/../.." && pwd)"
export PATH="$MOBILE_ROOT/node_modules/.bin:$MONOREPO_ROOT/node_modules/.bin:$PATH"

cd "$MOBILE_ROOT"

prev=""
for i in "$@"; do
  if [[ "$prev" == "--bundle-output" || "$prev" == "--sourcemap-output" || "$prev" == "-o" ]]; then
    mkdir -p "$(dirname "$i")"
  fi
  if [[ "$prev" == "--assets-dest" ]]; then
    mkdir -p "$i"
  fi
  prev="$i"
done

if [[ "$1" == *"@expo/cli"* || "$1" == *"/cli/build/bin/cli"* || "$1" == "export:embed" ]]; then
  if [[ "$1" != "export:embed" ]]; then
    shift
  fi
  exec expo "$@"
else
  exec node "$@"
fi
