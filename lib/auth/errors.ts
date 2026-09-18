/**
 * Lives apart from the server-only guards so client components can import the
 * action-result helpers without dragging Supabase into the browser bundle.
 */
export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}
