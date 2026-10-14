import { Save } from "./game";
export type Account = {
  uid: string;
  email: string | null;
  isAnonymous: boolean;
};
export const saveKey = (uid?: string) =>
  uid ? `bosmon-save-v1:${uid}` : "bosmon-save-v1";
export function chooseAccountSave(
  local: Save | null,
  remote: Save | null,
): Save | null {
  if (!local) return remote;
  if (!remote) return local;
  return remote.updatedAt > local.updatedAt ? remote : local;
}
export function authError(error: unknown): string {
  const code =
    error && typeof error === "object" && "code" in error
      ? String(error.code)
      : "";
  const messages: Record<string, string> = {
    "auth/invalid-credential": "The email or password is incorrect.",
    "auth/wrong-password": "The email or password is incorrect.",
    "auth/user-not-found": "The email or password is incorrect.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/email-already-in-use":
      "An account already uses this email. Sign in instead.",
    "auth/credential-already-in-use":
      "That account already exists. Sign out of the guest account, then sign in. Your guest save will remain separate.",
    "auth/weak-password":
      "Use a stronger password that meets the project’s password policy.",
    "auth/password-does-not-meet-requirements":
      "Use a stronger password that meets the project’s password policy.",
    "auth/popup-closed-by-user":
      "Google sign-in was cancelled. Try again when you’re ready.",
    "auth/cancelled-popup-request": "A sign-in window is already open.",
    "auth/popup-blocked":
      "Allow pop-ups for this site, then try Google sign-in again.",
    "auth/unauthorized-domain":
      "This site needs to be added to Firebase Authentication’s authorized domains.",
    "auth/operation-not-allowed":
      "This sign-in provider needs to be enabled in Firebase Authentication.",
    "auth/account-exists-with-different-credential":
      "Sign in using the method already associated with this email.",
    "auth/network-request-failed":
      "Could not connect. Check your connection and try again.",
    "auth/too-many-requests": "Too many attempts. Please wait and try again.",
    "auth/user-disabled": "This account has been disabled.",
  };
  return messages[code] ?? "Could not complete that request. Please try again.";
}
