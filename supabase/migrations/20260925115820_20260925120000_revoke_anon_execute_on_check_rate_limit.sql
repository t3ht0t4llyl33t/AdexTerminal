/*
# Lockdown: restrict check_rate_limit RPC to service_role only

## What this migration does
The `check_rate_limit` function is SECURITY DEFINER (runs with elevated privileges)
and was executable by the `anon` and `authenticated` roles via the PostgREST API.
The middleware calls it with the service_role key, so anon EXECUTE is unnecessary.

## Security impact
- Revoke EXECUTE from anon and authenticated on `check_rate_limit`.
- The middleware uses the service_role key (Bearer token), which bypasses
  EXECUTE restrictions, so rate limiting continues to work unchanged.
- External callers with only the anon key can no longer invoke this RPC.
*/

REVOKE EXECUTE ON FUNCTION check_rate_limit(text, integer, integer) FROM anon, authenticated;
