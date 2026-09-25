/*
# Revoke PUBLIC EXECUTE on check_rate_limit

The previous migration revoked EXECUTE from anon and authenticated, but the
function still has an implicit PUBLIC grant. This removes it so only the
service_role (which bypasses all permission checks) can invoke it.
*/

REVOKE EXECUTE ON FUNCTION check_rate_limit(text, integer, integer) FROM PUBLIC;
