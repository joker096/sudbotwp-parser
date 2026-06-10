#!/usr/bin/env bash
echo "=== Port 3002 exactly via tcp and tcp6 ==="
echo "--- IPv4 /proc/net/tcp ---"
grep ':0BB8 ' /proc/net/tcp 2>/dev/null || echo 'not found'
echo "--- IPv6 /proc/net/tcp6 ---"
grep ':0BB8 ' /proc/net/tcp6 2>/dev/null || echo 'not found'
echo ""
echo "=== PID 3025222 cmdline/env ==="
echo "CMD: $(cat /proc/3025222/cmdline 2>/dev/null | tr '\0' ' ')"
echo "ENV:"
cat /proc/3025222/environ 2>/dev/null | tr '\0' '\n' | head -20
echo ""
echo "=== FDs for PID 3025222 ==="
for fd in /proc/3025222/fd/[0-9]*; do
  link=$(readlink -f "$fd" 2>/dev/null)
  echo "$fd -> $link"
done | grep -E '3002|0BB8|socket'
