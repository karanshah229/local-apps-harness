#!/bin/bash
export EXPO_NO_TELEMETRY=1
export CI=1
export NODE_ENV=production
export PATH="/Users/karan/projects/Personal_projects/Saileshbhai/apps/microsoft-todo-mobile/node_modules/.bin:/Users/karan/projects/Personal_projects/Saileshbhai/node_modules/.bin:/Users/karan/.nvm/versions/node/v24.14.0/bin:/opt/homebrew/bin:$PATH"

cd "/Users/karan/projects/Personal_projects/Saileshbhai/apps/microsoft-todo-mobile"

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
