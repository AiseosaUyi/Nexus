/**
 * Turns a Supabase/PostgREST/Postgres error into a message that is safe and
 * useful to show a user. Raw database messages (policy names, table names,
 * constraint names) are logged server-side by the caller, never returned.
 */
type DbError = { code?: string; message?: string } | null | undefined;

export function toUserError(error: DbError, fallback = 'Something went wrong. Please try again.'): string {
  if (!error) return fallback;
  switch (error.code) {
    case '42501': // insufficient_privilege / RLS violation
      return 'You don’t have permission to do that.';
    case '23505': // unique_violation
      return 'That name or address is already taken.';
    case '23503': // foreign_key_violation
      return 'Something this depends on no longer exists. Refresh and try again.';
    case '23514': // check_violation
    case '22P02': // invalid_text_representation
    case '22023': // invalid_parameter_value
      return 'Some of the details aren’t valid.';
    case 'PGRST116': // .single() found no row (often RLS-hidden)
      return 'Not found, or you don’t have access.';
    default:
      return fallback;
  }
}
