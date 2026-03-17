#!/usr/bin/env bash
cd "$(dirname "$0")/.."

# ulimit만으로는 부족한 Mac이 많음. Watchman이 있으면 감시 초기화 후 실행
if command -v watchman &>/dev/null; then
  watchman watch-del-all &>/dev/null || true
fi

ulimit -n 10240 2>/dev/null || true
exec npx expo start "$@"
