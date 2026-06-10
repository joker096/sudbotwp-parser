#!/usr/bin/env bash
# Find every fd belonging to inode 30764176 and every process with a cmdline containing 3002/node
echo "=== INODE 30764176 ==="
found=0
for pid_dir in /proc/[0-9]*/; do
  pid="${pid_dir#/proc/}"
  [ -d "$pid_dir/fd" ] || continue
  for fd in "$pid_dir"/fd/[0-9]*; do
    [ -e "$fd" ] || continue
    link=$(readlink "$fd" 2>/dev/null)
    case "$link" in
      *socket*\[30764176\]) echo "PID $pid FD $fd -> $link"; found=$((found+1)) ;;
    esac
  done
done
echo "Total: $found"

echo ""
echo "=== ss modified /proc/net/tcp by INODE ==="
ss -tlnp

echo ""
echo "=== cmd grep ==="
for p in /proc/[0-9]*/; do
  [ -f "${p}cmdline" ] || continue
  cl=$(tr '\0' ' ' < "${p}cmdline" 2>/dev/null) || continue
  if echo "$cl" | grep -qE 'node|sud|cvr'; then
    echo "PID=${p#/proc/}: $cl"
  fi
done

echo ""
echo "=== ENV file mode ==="
for p in /proc/[0-9]*/; do
  [ -f "${p}environ" ] || continue
  env=$(tr '\0' '\n' < "${p}environ" 2>/dev/null) || continue
  if echo "$env" | grep -qE 'PORT=3002|sud.cvr|NODE_ENV'; then
    echo "PID=${p#/proc/}: $(echo "$env" | grep -E 'PORT|NODE_ENV|sud')"
  fi
done
