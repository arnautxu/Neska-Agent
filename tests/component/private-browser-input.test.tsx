// @vitest-environment jsdom
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { render } from "../render-spanish";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PrivateBrowserInput } from "@/components/private-browser-input";
import { SecureInput } from "@/components/aicss/secure-input";

const request = { id: "0198b9f0-6631-7000-8000-000000000412", threadId: "0198b9f0-6631-7000-8000-000000000411", preset: "login", origin: "https://login.example.test", expiresAt: "2099-01-01T00:00:00.000Z", phase: "form" };
afterEach(() => { vi.unstubAllGlobals(); });

describe("employee private input card", () => {
  it("sends only to the private route, clears the fields, and never uses chat or localStorage", async () => {
    const requests: { url: string; body?: string }[] = [];
    const fetcher = vi.fn(async (url: string, init?: RequestInit) => {
      requests.push({ url, body: init?.body as string | undefined });
      return { ok: true, json: async () => init?.method === "POST" ? { ok: true } : {
        protected: true, request, browserSessionId: "0198b9f0-6631-7000-8000-000000000413",
      } };
    });
    vi.stubGlobal("fetch", fetcher);
    const storage = vi.spyOn(Storage.prototype, "setItem");
    const open = vi.fn();
    const result = render(<PrivateBrowserInput threadId={request.threadId} onOpenBrowser={open} />);
    fireEvent.change(await screen.findByLabelText("Correo o usuario"), { target: { value: "employee" } });
    fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: "synthetic-private-sentinel" } });
    fireEvent.click(screen.getByRole("button", { name: "Continúa" }));
    await waitFor(() => expect(open).toHaveBeenCalledTimes(1));
    expect(requests.filter(item => item.body)).toEqual([{
      url: "/api/runtime/browser/secure-input",
      body: JSON.stringify({ action: "fill", threadId: request.threadId, browserSessionId: "0198b9f0-6631-7000-8000-000000000413", requestId: request.id, values: { email: "employee", password: "synthetic-private-sentinel" } }),
    }]);
    expect(storage).not.toHaveBeenCalled();
    expect(result.container.textContent).not.toContain("synthetic-private-sentinel");
    await waitFor(() => expect(result.container.querySelector('input')).toBeNull());
    storage.mockRestore();
    result.unmount();
  });

  it("cannot report success without an actual transport", async () => {
    render(<SecureInput preset="login" />);
    fireEvent.change(screen.getByLabelText("Correo o usuario"), { target: { value: "employee" } });
    fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: "synthetic" } });
    fireEvent.click(screen.getByRole("button", { name: "Continúa" }));
    expect(await screen.findByText(/No se ha podido rellenar/)).toBeInTheDocument();
    expect(screen.queryByText("Rellenado en la página.")).toBeNull();
  });
});
