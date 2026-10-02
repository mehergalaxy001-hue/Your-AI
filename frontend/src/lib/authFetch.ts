import { getIdToken } from "../context/AuthContext";

/** fetch() that attaches the signed-in user's Firebase ID token for the Galaxy AI backend. */
export async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const token = await getIdToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}
