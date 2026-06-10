#!/usr/bin/env bash
INODE="30764176"
echo "=== Looking for socket inode $INODE ==="
found=0
for fd in /proc/*/fd/[0-9]*; do
  [ -e "$fd" ] || continue
  link=$(readlink -f "$fd" 2>/dev/null) || continue
  case "$link" in
    *socket*\[$INODE\])
      dir=$(dirname "$fd")
      pid=${dir#/proc/}
      echo "FOUND: PID=$pid dir=$dir"
      echo "  exe: $(cat "$dir/cmdline" 2>/dev/null | tr '\0' ' ')"
      echo "  exe2: $(ls -la "$dir/../exe" 2>/dev/null)"
      found=$((found+1))
      ;;
  esac
done
echo "Total found: $found"
