import { readFile } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const workflowPath = path.join(process.cwd(), ".github", "workflows", "backend-ci.yml");
type Job = {
  name: string;
  needs?: string | string[];
  if?: string;
  "continue-on-error"?: boolean;
  strategy?: { "fail-fast": boolean; matrix: { shard?: number[]; include?: { command: string }[] } };
  steps: { run?: string; if?: string; "continue-on-error"?: boolean; env?: Record<string, string>; with?: Record<string, unknown> }[];
};
const yaml = createRequire(import.meta.url)("js-yaml") as { load(source: string): { jobs: Record<string, Job> } };

async function readJobs() {
  return yaml.load(await readFile(workflowPath, "utf8")).jobs;
}

describe("backend CI contract", () => {
  it("runs three complete Vitest shards independently of the non-test quality checks", async () => {
    const jobs = await readJobs();
    const build = jobs["quality-build"];
    const tests = jobs["quality-tests"];
    expect(tests.strategy).toEqual({ "fail-fast": false, matrix: { shard: [1, 2, 3] } });
    expect(tests.steps.filter((step) => step.run?.startsWith("npm test"))).toEqual([
      { name: "Unit, integration and contract test shard", run: "npm test -- --shard=${{ matrix.shard }}/3" },
    ]);
    for (const job of [build, tests]) {
      expect(job.needs).toBeUndefined();
      expect(job.if).toBeUndefined();
      expect(job["continue-on-error"]).toBeUndefined();
      expect(job.steps.every((step) => !step.if && !step["continue-on-error"])).toBe(true);
      expect(job.steps.some((step) => step.run === "npm ci")).toBe(true);
      expect(job.steps.some((step) => step.with?.cache === "npm" && step.with["cache-dependency-path"] === "package-lock.json")).toBe(true);
    }
    const commands = build.steps.map((step) => step.run ?? "").join("\n");
    for (const command of ["npm run contracts:verify", "npm run typecheck", "npm run lint", "test_rdp*.py", "test_knowledge*.py", "--require-hashes", "npm run build:automation-worker", "npm run build", "scripts/verify-security-http.ts", "npm run infra:validate"]) {
      expect(commands).toContain(command);
    }
    expect(commands).not.toContain("npm test");
  });

  it("retains the required check and fails closed for every non-success dependency result", async () => {
    const gate = (await readJobs()).quality;
    expect(gate.name).toBe("Types, lint, contracts, tests and build");
    expect(gate.needs).toEqual(["quality-build", "quality-tests"]);
    expect(gate.if).toBe("always()");
    expect(gate["continue-on-error"]).toBeUndefined();
    expect(gate.steps).toHaveLength(1);
    const step = gate.steps[0];
    expect(step.if).toBeUndefined();
    expect(step["continue-on-error"]).toBeUndefined();
    expect(step.env).toEqual({ BUILD_RESULT: "${{ needs.quality-build.result }}", TESTS_RESULT: "${{ needs.quality-tests.result }}" });
    expect(step.run).toBeTruthy();
    for (const build of ["success", "failure", "cancelled", "skipped", ""]) {
      for (const tests of ["success", "failure", "cancelled", "skipped", ""]) {
        const result = spawnSync("bash", ["--noprofile", "--norc", "-eo", "pipefail", "-c", step.run!], {
          env: { ...process.env, BUILD_RESULT: build, TESTS_RESULT: tests },
        });
        expect(result.error).toBeUndefined();
        expect(result.status === 0, `build=${build}, tests=${tests}`).toBe(build === "success" && tests === "success");
      }
    }
  });

  it("preserves the independent E2E partition and publication caches", async () => {
    const jobs = await readJobs();
    expect(jobs["e2e-suites"].needs).toBeUndefined();
    expect(jobs["e2e-suites"].strategy?.["fail-fast"]).toBe(false);
    expect([
      ...(jobs["e2e-suites"].strategy?.matrix.include?.map((entry) => entry.command) ?? []),
      ...jobs.webkit.steps.filter((step) => step.run === "npx playwright test --project=webkit-iphone").map((step) => step.run),
    ]).toEqual([
      "npm run test:e2e:backend",
      "npx playwright test --project=chromium-desktop --shard=1/2",
      "npx playwright test --project=chromium-desktop --shard=2/2",
      "npx playwright test --project=webkit-iphone",
    ]);
    expect(jobs["enc02-webkit-scope"]).toBeUndefined();
    expect(jobs.webkit.needs).toBeUndefined();
    expect(jobs.webkit.if).toBeUndefined();
    expect(jobs.webkit["continue-on-error"]).toBeUndefined();
    expect(jobs.webkit.steps.every((step) => !step.if && !step["continue-on-error"])).toBe(true);
    expect(jobs.webkit.steps.some((step) => step.run === "npx playwright test --config=playwright.recovery.config.ts --project=webkit-recovery")).toBe(true);
    expect(jobs.e2e.needs).toEqual(["e2e-suites", "webkit"]);
    expect(jobs.e2e.if).toBe("always()");
    const publish = await readFile(path.join(process.cwd(), ".github/workflows/publish-ghcr.yml"), "utf8");
    expect(publish).toContain("cache-from:");
    expect(publish).toContain("cache-to:");
    expect(publish).toContain(":buildcache");
  });

  it("keeps publication disabled and validates explicit image destinations before authentication", async () => {
    const workflow = yaml.load(await readFile(path.join(process.cwd(), ".github/workflows/publish-ghcr.yml"), "utf8"));
    const publish = workflow.jobs.publish;
    expect(publish.if).toContain("false &&");
    const validationIndex = publish.steps.findIndex((step) => step.run?.includes('"$APP_REPOSITORY" != "$EGRESS_REPOSITORY"'));
    const authenticationIndex = publish.steps.findIndex((step) => step.with?.registry === "ghcr.io");
    expect(validationIndex).toBeGreaterThanOrEqual(0);
    expect(validationIndex).toBeLessThan(authenticationIndex);
    for (const [app, egress, valid] of [
      ["ghcr.io/example/neska", "ghcr.io/example/neska-egress", true],
      ["", "ghcr.io/example/neska-egress", false],
      ["ghcr.io/example/neska", "ghcr.io/example/neska", false],
      ["registry.example/neska", "ghcr.io/example/neska-egress", false],
      ["ghcr.io/example/neska:latest", "ghcr.io/example/neska-egress", false],
    ] as const) {
      const result = spawnSync("bash", ["--noprofile", "--norc", "-eo", "pipefail", "-c", publish.steps[validationIndex].run!], {
        env: { ...process.env, APP_REPOSITORY: app, EGRESS_REPOSITORY: egress },
      });
      expect(result.error).toBeUndefined();
      expect(result.status === 0).toBe(valid);
    }
  });

  it("rejects every incomplete E2E dependency, including skipped WebKit", async () => {
    const step = (await readJobs()).e2e.steps[0];
    expect(step.if).toBeUndefined();
    expect(step["continue-on-error"]).toBeUndefined();
    expect(step.env).toEqual({
      SUITES_RESULT: "${{ needs.e2e-suites.result }}",
      WEBKIT_RESULT: "${{ needs.webkit.result }}",
    });
    for (const suites of ["success", "failure", "cancelled", "skipped", ""]) {
      for (const webkit of ["success", "failure", "cancelled", "skipped", ""]) {
        const result = spawnSync("bash", ["--noprofile", "--norc", "-eo", "pipefail", "-c", step.run!], {
          env: { ...process.env, SUITES_RESULT: suites, WEBKIT_RESULT: webkit },
        });
        expect(result.error).toBeUndefined();
        expect(result.status === 0, `suites=${suites}, webkit=${webkit}`).toBe(suites === "success" && webkit === "success");
      }
    }
  });

  it("keeps every required deterministic gate in the protected workflow", async () => {
    const workflow = await readFile(workflowPath, "utf8");
    for (const command of [
      "npm ci",
      "npm run contracts:verify",
      "npm run typecheck",
      "npm run lint",
      "npm test",
      "npm run test:e2e",
      "npm run build",
      "npm run infra:validate",
      "npm run test:documents:real",
      "docker compose",
      "--target runtime",
      "--target egress-gateway",
      "--no-cache",
    ]) {
      expect(workflow, `missing CI gate: ${command}`).toContain(command);
    }
    expect(workflow).toContain("npm audit --omit=dev --audit-level=high");
    expect(workflow).toContain("node-version: 24.18.1");
    expect(workflow).toMatch(/permissions:\n\s+contents: read/u);
  });

  it("pins actions and does not grant CI a secret-bearing trigger", async () => {
    const workflow = await readFile(workflowPath, "utf8");
    const uses = [...workflow.matchAll(/^\s*uses:\s*([^\s#]+)/gmu)].map((match) => match[1]);
    expect(uses.length).toBeGreaterThan(0);
    expect(uses.every((value) => /@[0-9a-f]{40}$/u.test(value))).toBe(true);
    expect(workflow).not.toContain("pull_request_target");
    expect(workflow).not.toContain("secrets.");
    expect(workflow).not.toMatch(/contents:\s*write/u);
    expect(workflow).not.toMatch(/persist-credentials:\s*true/u);
  });

});
