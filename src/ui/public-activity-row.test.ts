import { describe, expect, it } from "vitest";
import { publicActivityRow } from "./public-activity-row";
describe("public activity rows", () => {
  it("never publishes reasoning or private runtime lifecycle", () => {
    expect(publicActivityRow({ id: "r", kind: "reasoning", label: "Private thoughts", status: "complete" })).toBeNull();
    expect(publicActivityRow({ id: "runtime-reasoning", kind: "system", label: "Private thoughts", status: "running" })).toBeNull();
  });
  it("does not fabricate time or an object for a legacy event", () => {
    expect(publicActivityRow({ id: "tool", kind: "tool", label: "Consulta autoritzada", status: "complete" })).toMatchObject({ verb: "Consulta", object: null, timestamp: null });
  });
  it("shows the explicit decision criterion rather than tool output", () => {
    expect(publicActivityRow({ id: "decision", kind: "decision", label: "Comparar", criterion: "Coincidència d’import i NIF", output: "Private output", object: "factura.pdf", timestamp: "2026-10-11T09:00:00.000Z", status: "complete" })).toMatchObject({ verb: "Decideix", detail: "Coincidència d’import i NIF", object: "factura.pdf", timestamp: "2026-10-11T09:00:00.000Z" });
  });
});
