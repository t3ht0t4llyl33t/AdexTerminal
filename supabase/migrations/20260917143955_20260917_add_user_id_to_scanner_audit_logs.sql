/*
# Add per-user scan history to scanner_audit_logs

## Purpose
The Security Vault screen now shows each user's last 5 scans. The audit log table
previously stored only global entries, so history could not be filtered per Telegram user.

## Changes
1. Modified table: `scanner_audit_logs`
   - New column `telegram_user_id text` — Telegram user who requested the scan (NULL for legacy/system rows).
2. New index `idx_scanner_audit_tg_user` on (telegram_user_id, created_at DESC) for fast per-user history lookups.

## Security
- RLS stays as-is (anon CRUD policies on scanner_audit_logs already exist from earlier migrations).
- Writes happen only from the server route via the service role.
*/

ALTER TABLE scanner_audit_logs ADD COLUMN IF NOT EXISTS telegram_user_id text;

CREATE INDEX IF NOT EXISTS idx_scanner_audit_tg_user ON scanner_audit_logs (telegram_user_id, created_at DESC);