/*
# Reduce scan_cache retention from 7 days to 3 days

## Purpose
The scan_cache table was pruning rows older than 7 days.
3 days is sufficient — repeated scans of the same contract within 3 days
are served from cache, older entries are re-fetched from external APIs.
This keeps the table smaller.

## Changes
- Drop the old prune_scan_cache cron job.
- Recreate it with a 3-day interval.
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'prune_scan_cache'
  ) THEN
    PERFORM cron.unschedule('prune_scan_cache');
  END IF;
END $$;

DO $$
BEGIN
  PERFORM cron.schedule(
    'prune_scan_cache',
    '0 3 * * *',
    $q$DELETE FROM scan_cache WHERE updated_at < now() - interval '3 days'$q$
  );
END $$;
