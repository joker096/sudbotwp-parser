// IP tracker for spam detection
// Tracks IPs that submitted spam leads and blocks them temporarily

import Database from 'better-sqlite3';
import { mkdirp } from 'fs';
import { join } from 'path';

const DB_PATH = join(__dirname, '../data/spam-ip.db');

// Ensure directory exists
try {
  mkdirp.sync(join(__dirname, '../data'));
} catch (e) {
  // Directory might already exist
}

const db = new Database(DB_PATH);

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS blocked_ips (
    ip TEXT PRIMARY KEY,
    blocked_at TEXT NOT NULL,
    blocked_until TEXT NOT NULL,
    reason TEXT NOT NULL DEFAULT 'spam detected',
    spam_count INTEGER DEFAULT 1
  );
  
  CREATE TABLE IF NOT EXISTS ip_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip TEXT NOT NULL,
    lead_id TEXT,
    reason TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_ip_history_ip ON ip_history(ip);
`);

// Block an IP
export function blockIP(ip, reason = 'spam detected') {
  const now = new Date().toISOString();
  const blockedUntil = new Date(Date.now() + 3600000).toISOString(); // 1 hour block

  // Check if already blocked
  const existing = db.prepare('SELECT * FROM blocked_ips WHERE ip = ?').get(ip);
  if (existing) {
    // Extend the block
    db.prepare('UPDATE blocked_ips SET blocked_until = ?, spam_count = spam_count + 1, reason = ? WHERE ip = ?')
      .run(blockedUntil, reason, ip);
    return false; // Not a new block
  }

  db.prepare('INSERT INTO blocked_ips (ip, blocked_at, blocked_until, reason, spam_count) VALUES (?, ?, ?, ?, 1)').run(
    ip,
    now,
    blockedUntil,
    reason
  );

  db.prepare('INSERT INTO ip_history (ip, reason) VALUES (?, ?)').run(ip, reason);
  console.log(`[IP Block] ${ip} blocked until ${blockedUntil}: ${reason}`);
  return true; // New block
}

// Check if an IP is blocked
export function isIPBlocked(ip) {
  const record = db.prepare('SELECT * FROM blocked_ips WHERE ip = ?').get(ip);
  if (!record) return false;

  // Check if still within block period
  if (new Date(record.blocked_until) > new Date()) {
    return true;
  }

  // Block expired, remove it
  db.prepare('DELETE FROM blocked_ips WHERE ip = ?').run(ip);
  return false;
}

// Get all blocked IPs count
export function getBlockedCount() {
  return db.prepare('SELECT COUNT(*) as count FROM blocked_ips WHERE blocked_until > ?').get(new Date().toISOString()).count;
}

// Clean up expired blocks (run periodically)
export function cleanupExpired() {
  const result = db.prepare('DELETE FROM blocked_ips WHERE blocked_until <= ?').run(new Date().toISOString());
  if (result.changes > 0) {
    console.log(`[IP Cleanup] Removed ${result.changes} expired blocks`);
  }
}

// Get IP history
export function getIPHistory(ip) {
  return db.prepare('SELECT * FROM ip_history WHERE ip = ? ORDER BY created_at DESC LIMIT 20').all(ip);
}
