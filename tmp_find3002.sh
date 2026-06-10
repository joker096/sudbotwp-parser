#!/bin/bash
echo "=== All TCP listeners ==="
ss -tlnp

echo ""
echo "=== /proc/net/tcp for :3002 ==="
grep ':0BB8' /proc/net/tcp 2>/dev/null | head || grep '0BB8' /proc/net/tcp6 2>/dev/null | head

echo ""
echo "=== Which process ==="
for pid_dir in /proc/[0-9]*; do
  pid="${pid_dir##*/}"
  [ -f "$pid_dir/cmdline" ] || continue
  exe=$(tr '\0' ' ' < "$pid_dir/cmdline")
  [ -n "$exe" ] || continue
  for fd in "$pid_dir"/fd/*; do
    [ -L "$fd" ] || continue
    link=$(readlink "$fd" 2>/dev/null)
    case "$link" in
      *socket*[[]0BB8[]]*|*socket*[[]0778[]]*)
        echo "PID $pid: $exe"
        echo "  FD $fd -> $link"
        break
      ;;
    esac
  done
done 2>/dev/null
