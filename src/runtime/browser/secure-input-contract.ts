/** Public metadata only. Values never belong in a chat event or tool call. */
export const PRIVATE_INPUT_PRESETS = ["login", "otp", "secret", "pin"] as const;
export type PrivateInputPreset = typeof PRIVATE_INPUT_PRESETS[number];
export type PrivateInputValues = Record<string, string>;
export type PrivateInputView = {
  id: string;
  threadId: string;
  preset: PrivateInputPreset;
  origin: string;
  expiresAt: string;
  phase: "form" | "filled" | "failed" | "expired";
};
export type PrivateInputStatus = {
  protected: boolean;
  request: PrivateInputView | null;
};

export function privateInputKeys(preset: PrivateInputPreset): string[] {
  return preset === "login" ? ["email", "password"] : [preset === "pin" ? "pin" : "code"];
}

export function validPrivateInputValues(preset: PrivateInputPreset, value: unknown): value is PrivateInputValues {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  const keys = privateInputKeys(preset);
  if (Object.keys(record).length !== keys.length || keys.some(key => !Object.hasOwn(record, key))) return false;
  if (Object.values(record).some(item => typeof item !== "string" || item.length < 1 || item.length > 4096 || /[\u0000-\u001f\u007f]/u.test(item))) return false;
  if (preset === "otp") return /^\d{6}$/u.test(String(record.code));
  if (preset === "pin") return /^\d{4}$/u.test(String(record.pin));
  return true;
}
