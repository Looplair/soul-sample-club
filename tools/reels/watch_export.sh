#!/bin/zsh
# Keeps a long bulk export going and writes where it's up to, so an interrupted run can be picked up.
#   zsh watch_export.sh            (runs until nothing is left waiting)
# Progress: ~/.ssc-reels-export-progress.txt (last line = latest). If the tool stops or restarts, this
# restarts it and sets the queue going again; a reel caught mid-render is put back to waiting.
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
DIR="${0:A:h}"; API="http://localhost:7476/api"; LOG="$HOME/.ssc-reels-export-progress.txt"
while true; do
  if ! curl -s "$API/queue" >/dev/null; then
    echo "$(date '+%d %b %H:%M') tool not answering, starting it" >> "$LOG"
    (cd "$DIR" && nohup node server.js > /tmp/ssc-reels.log 2>&1 &); sleep 8; continue
  fi
  read -r waiting rendering done failed running <<< "$(curl -s "$API/queue" | python3 -c "
import json,sys;q=json.load(sys.stdin);it=q['items']
print(sum(e['status']=='waiting' for e in it), sum(e['status']=='rendering' for e in it), sum(e['status']=='done' for e in it), sum(e['status']=='failed' for e in it), int(bool(q['running'])))")"
  echo "$(date '+%d %b %H:%M') done $done · waiting $waiting · rendering $rendering · failed $failed" >> "$LOG"
  if [ "$waiting" = "0" ] && [ "$rendering" = "0" ]; then echo "$(date '+%d %b %H:%M') FINISHED" >> "$LOG"; exit 0; fi
  # stopped with work left (a restart, or the queue was paused): set it going again
  if [ "$rendering" = "0" ]; then curl -s -X POST "$API/export-all" >/dev/null; echo "$(date '+%d %b %H:%M') restarted the queue" >> "$LOG"; fi
  sleep 60
done
