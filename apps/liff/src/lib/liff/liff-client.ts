// ============================================================
// LIFF Client wrapper
//
// Abstracts @line/liff SDK initialization.
// In dev mode (no LIFF_ID set), returns mock user data so
// you can develop and test without a LINE account.
// ============================================================

import type { Liff } from "@line/liff";

let liffInstance: Liff | null = null;
let initialized = false;

export interface LiffProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
  language?: string;
}

const MOCK_PROFILE: LiffProfile = {
  userId: "Umock1234567890",
  displayName: "Mock Farmer",
  pictureUrl: undefined,
  language: "th",
};

export async function initLiff(): Promise<void> {
  if (initialized) return;

  const liffId = process.env.NEXT_PUBLIC_LIFF_ID;

  // Dev mode — skip real LIFF init
  if (!liffId || liffId === "mock-liff-id") {
    console.warn("[LIFF] Running in mock mode (no LIFF_ID set)");
    initialized = true;
    return;
  }

  // Import LIFF SDK dynamically (client-side only)
  const liffModule = await import("@line/liff");
  liffInstance = liffModule.default as unknown as Liff;

  await liffInstance.init({ liffId });
  initialized = true;

  // Redirect to LINE login if not authenticated
  if (!liffInstance.isLoggedIn()) {
    liffInstance.login();
  }
}

export async function getLiffProfile(): Promise<LiffProfile> {
  if (!liffInstance) return MOCK_PROFILE;

  const profile = await liffInstance.getProfile();
  return {
    userId: profile.userId,
    displayName: profile.displayName,
    pictureUrl: profile.pictureUrl,
    statusMessage: profile.statusMessage,
    language: liffInstance.getLanguage() ?? undefined,
  };
}

export function getLiffAccessToken(): string | null {
  if (!liffInstance) return null;
  return liffInstance.getAccessToken();
}

export function isLiffReady(): boolean {
  return initialized;
}

export function isInLineApp(): boolean {
  if (!liffInstance) return false;
  return liffInstance.isInClient();
}

/** Close the LIFF window (returns to LINE chat) */
export function closeLiff(): void {
  liffInstance?.closeWindow();
}

/** Send a message back to the LINE chat from LIFF */
export async function sendMessageToChat(
  messages: Array<{ type: string; text?: string }>
): Promise<void> {
  if (!liffInstance || !liffInstance.isInClient()) return;
  await liffInstance.sendMessages(messages);
}
