import type { PrivateInputPreset } from "./secure-input-contract";

/** Static, server-owned DOM discovery. Never reads an input value. */
export function discoverPrivateInputs(preset: PrivateInputPreset, marker: string) {
  return `(() => {
    const visible = e => {
      const r = e.getBoundingClientRect(), s = getComputedStyle(e);
      return e instanceof HTMLInputElement && !e.disabled && !e.readOnly && r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
    };
    const inputs = [...document.querySelectorAll('input')].filter(visible);
    const hint = e => [e.name, e.id, e.autocomplete, e.getAttribute('aria-label')].join(' ').toLowerCase();
    const unique = list => list.length === 1 ? list : [];
    const preset = ${JSON.stringify(preset)};
    let fields = [];
    if (preset === 'login') {
      const password = unique(inputs.filter(e => e.type === 'password' && e.autocomplete !== 'new-password'));
      if (!password.length) return null;
      const email = unique(inputs.filter(e => e.form === password[0].form &&
        (e.type === 'email' || e.type === 'tel' || e.autocomplete === 'username' || /(?:^|[\\s_-])(?:email|username|login|user)(?:$|[\\s_-])/.test(hint(e))) && e.type !== 'password'));
      if (!email.length) return null;
      fields = [{ key: 'email', element: email[0] }, { key: 'password', element: password[0] }];
    } else {
      const candidates = inputs.filter(e => e.autocomplete === 'one-time-code' ||
        /(?:^|[\\s_-])(?:otp(?:code)?|one.?time(?:.?code)?|passcode|verification(?:.?code)?|verifica|codi|code|pin(?:code)?)(?:$|[\\s_-]|\\d)/.test(hint(e)));
      const size = preset === 'pin' ? 4 : 6;
      if (candidates.length === 1) fields = [{ key: preset === 'pin' ? 'pin' : 'code', element: candidates[0] }];
      else if (preset !== 'secret' && candidates.length === size && candidates.every(e => e.maxLength === 1 && e.form === candidates[0].form)) {
        fields = candidates.map((element, index) => ({ key: preset === 'pin' ? 'pin' : 'code', index, element }));
      } else return null;
    }
    const form = fields[0].element.form;
    if (fields.some(f => f.element.form !== form) || (form && new URL(form.action, location.href).origin !== location.origin)) return null;
    return { url: location.href, fields: fields.map((f, i) => {
      const token = ${JSON.stringify(marker)} + '-' + i;
      f.element.setAttribute('data-neska-private-input', token);
      return { key: f.key, index: f.index ?? null, type: f.element.type, selector: 'input[data-neska-private-input="' + token + '"]' };
    }) };
  })()`;
}

// Invoked against a resolved backend node, never a page-chosen callback.
// The return value contains only a boolean; no input is read back into Node/model output.
export const privateInputFunction = `function(expectedUrl, expectedType, value) {
  if (!(this instanceof HTMLInputElement) || !this.isConnected || this.disabled || this.readOnly ||
      location.href !== expectedUrl || this.type !== expectedType ||
      (this.form && new URL(this.form.action, location.href).origin !== location.origin)) return false;
  const rect = this.getBoundingClientRect(), style = getComputedStyle(this);
  if (rect.width <= 0 || rect.height <= 0 || style.visibility === 'hidden' || style.display === 'none') return false;
  if (value === null) return true;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  setter.call(this, value);
  this.dispatchEvent(new Event('input', { bubbles: true }));
  this.dispatchEvent(new Event('change', { bubbles: true }));
  return this.value === value;
}`;
