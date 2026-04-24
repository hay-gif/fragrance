/**
 * Authenticated fetch — automatically attaches the Supabase Bearer token
 * to every request so protected API routes can verify the caller.
 */
import { supabase } from "@/lib/supabase";

export async function authFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  let { data: { session } } = await supabase.auth.getSession();

  // Attempt token refresh if session is missing or expired
  if (!session?.access_token) {
    const { data: refreshed } = await supabase.auth.refreshSession();
    session = refreshed?.session ?? null;
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Safely merge incoming headers regardless of type (plain object or Headers instance)
  if (options.headers instanceof Headers) {
    options.headers.forEach((value, key) => {
      headers[key] = value;
    });
  } else if (options.headers) {
    Object.assign(headers, options.headers as Record<string, string>);
  }

  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }

  return fetch(url, { ...options, headers });
}
