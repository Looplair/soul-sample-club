#!/bin/zsh
# Double-click to open SSC Reels. Starts the local server (if it isn't already running)
# and opens the tool in Chrome. Closing this window stops exports.
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
DIR="${0:A:h}"
URL="http://localhost:7476"
if curl -s "$URL/api/queue" | grep -q '"items"'; then
  open -a "Google Chrome" "$URL"
  exit 0
fi
cd "$DIR" || exit 1
[ -d node_modules ] || npm install --no-audit --no-fund || exit 1
( sleep 2; open -a "Google Chrome" "$URL" ) &
exec node server.js
