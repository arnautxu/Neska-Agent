export const BROWSER_RUNTIME_CAPABILITIES = Object.freeze({
  schemaVersion: 1 as const,
  agentTools: Object.freeze([
    "secure_input", "capabilities", "open", "read", "screenshot", "scroll", "click", "type", "tabs", "downloads",
  ] as const),
  viewerControls: Object.freeze([
    "url", "back", "forward", "reload", "continuous-scroll", "fullscreen",
  ] as const),
  notes: Object.freeze({
    secureInput: "Use secure_input for passwords and verification codes. Values go from the employee form directly to the private browser; agent tools are fenced until the employee finishes and closes private pages.",
    fullscreen: "Fullscreen is a viewer control available to the employee, not an agent page mutation.",
    history: "Back, forward and reload are visible viewer controls; open provides agent URL navigation.",
  }),
});

export function browserRuntimeCapabilityInventory() {
  return BROWSER_RUNTIME_CAPABILITIES;
}
