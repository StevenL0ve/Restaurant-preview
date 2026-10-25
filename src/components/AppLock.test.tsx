import { describe, it, expect, vi, beforeEach } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";

// Stand in for the native side: the auth context and Capacitor's App events.
const auth = {
  bioAvailable: true,
  bioEnabled: true,
  bioLabel: "Face ID",
  bioUnlock: vi.fn<() => Promise<boolean>>(),
  signOut: vi.fn(),
};
vi.mock("../state/auth", () => ({ useAuth: () => auth }));
let appStateCb: ((s: { isActive: boolean }) => void) | null = null;
vi.mock("@capacitor/app", () => ({
  App: {
    addListener: (_e: string, cb: (s: { isActive: boolean }) => void) => {
      appStateCb = cb;
      return Promise.resolve({ remove: () => undefined });
    },
  },
}));
vi.mock("./Mascot", () => ({ Mascot: () => null }));

import { AppLock } from "./AppLock";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

async function mount() {
  const el = document.createElement("div");
  document.body.appendChild(el);
  const root = createRoot(el);
  await act(async () => { root.render(<AppLock />); });
  return { el, root };
}

describe("Face ID app lock", () => {
  beforeEach(() => {
    auth.bioAvailable = true;
    auth.bioEnabled = true;
    auth.bioUnlock.mockReset();
    appStateCb = null;
  });

  it("opens locked, prompts immediately, and unlocks on success", async () => {
    auth.bioUnlock.mockResolvedValue(true);
    const { el } = await mount();
    expect(auth.bioUnlock).toHaveBeenCalledTimes(1);
    expect(el.textContent).not.toContain("ORSync is locked");
  });

  it("stays locked with a retry and sign-out escape when the scan fails", async () => {
    auth.bioUnlock.mockResolvedValue(false);
    const { el } = await mount();
    expect(el.textContent).toContain("ORSync is locked");
    expect(el.textContent).toContain("Unlock with Face ID");
    expect(el.textContent).toContain("Sign out instead");
  });

  it("relocks only after a minute in the background", async () => {
    auth.bioUnlock.mockResolvedValue(true);
    const { el } = await mount();
    const now = vi.spyOn(Date, "now");
    now.mockReturnValue(1_000_000);
    await act(async () => { appStateCb!({ isActive: false }); });
    now.mockReturnValue(1_000_000 + 20_000); // quick app switch
    await act(async () => { appStateCb!({ isActive: true }); });
    expect(auth.bioUnlock).toHaveBeenCalledTimes(1);
    auth.bioUnlock.mockResolvedValue(false);
    await act(async () => { appStateCb!({ isActive: false }); });
    now.mockReturnValue(1_000_000 + 20_000 + 90_000); // left on the back table
    await act(async () => { appStateCb!({ isActive: true }); });
    expect(auth.bioUnlock).toHaveBeenCalledTimes(2);
    expect(el.textContent).toContain("ORSync is locked");
    now.mockRestore();
  });

  it("does nothing when the lock is off or the device can't do it", async () => {
    auth.bioEnabled = false;
    const { el } = await mount();
    expect(auth.bioUnlock).not.toHaveBeenCalled();
    expect(el.textContent).toBe("");
  });
});
