import { readFile } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const workflowPath = path.join(process.cwd(), ".github", "workflows", "backend-ci.yml");
type Job = {
  name: string;
  "runs-on"?: string;
  needs?: string | string[];
  if?: string;
  "continue-on-error"?: boolean;
  strategy?: { "fail-fast": boolean; matrix: { runner?: string[]; shard?: number[]; include?: { command: string }[] } };
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
    expect(tests.strategy).toEqual({ "fail-fast": false, matrix: { runner: ["ubuntu-24.04-arm"], shard: [1, 2, 3] } });
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

  it("requires only native ARM64 for every execution and publication gate", async () => {
    const jobs = await readJobs();
    for (const id of ["quality-build", "quality-tests", "e2e-suites", "webkit", "documents", "containers"]) {
      expect(jobs[id]["runs-on"]).toBe("${{ matrix.runner }}");
      expect(jobs[id].strategy?.matrix.runner).toEqual(["ubuntu-24.04-arm"]);
      expect(jobs[id]["continue-on-error"]).toBeUndefined();
    }
    const publish = await readFile(path.join(process.cwd(), ".github/workflows/publish-ghcr.yml"), "utf8");
    expect(publish).toContain("platforms: linux/${{ matrix.arch }}");
    expect(publish).toContain("arch: arm64");
    expect(yaml.load(publish).jobs.publish.strategy?.matrix).toEqual({ include: [{ runner: "ubuntu-24.04-arm", arch: "arm64" }] });
    for (const job of Object.values(jobs)) {
      if (job.strategy) expect(job.strategy.matrix.runner).toEqual(["ubuntu-24.04-arm"]);
      else expect(job["runs-on"]).toBe("ubuntu-24.04-arm");
    }
    expect(jobs.containers.steps.some((step) => step.env?.EXPECTED_ARCH === "aarch64")).toBe(true);
    expect(publish).toContain("buildcache-${{ matrix.arch }}");
    expect(publish).toContain("head_sha }}-${{ matrix.arch }}");
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

  it("requires operator opt-in and successful same-repository main CI before publication", async () => {
    const workflow = yaml.load(await readFile(path.join(process.cwd(), ".github/workflows/publish-ghcr.yml"), "utf8"));
    const publish = workflow.jobs.publish;
    expect(publish.if).toContain("vars.NESKA_PUBLISH_ENABLED == 'true'");
    expect(publish.if).toContain("github.event.workflow_run.conclusion == 'success'");
    expect(publish.if).toContain("github.event.workflow_run.event == 'push'");
    expect(publish.if).toContain("github.event.workflow_run.head_branch == 'main'");
    expect(publish.if).toContain("github.event.workflow_run.head_repository.full_name == github.repository");
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
      "target: runtime",
      "target: egress-gateway",
      "no-cache:",
      "bash scripts/scan-container-images.sh",
      "/usr/local/share/aibrain/container-browser-acceptance.mjs",
    ]) {
      expect(workflow, `missing CI gate: ${command}`).toContain(command);
    }
    expect(workflow).toContain("npm audit --omit=dev --audit-level=high");
    expect(workflow).toContain("node-version: 24.21.0");
    expect(workflow).toMatch(/permissions:\n\s+contents: read/u);
  });

  it("loads SHA-bound native images from isolated caches without skipping any acceptance gate", async () => {
    const job = (await readJobs()).containers;
    const builds = job.steps.filter(step => step.with?.target === "runtime" || step.with?.target === "egress-gateway");
    expect(builds).toHaveLength(2);
    for (const [index, step] of builds.entries()) {
      expect(step.if).toBeUndefined();
      expect(step["continue-on-error"]).toBeUndefined();
      expect(step.with).toMatchObject({ context: ".", platforms: "linux/arm64", pull: true, load: true, push: false,
        "build-args": "AIBRAIN_REVISION=${{ github.sha }}",
        "no-cache": "${{ github.event_name == 'workflow_dispatch' && inputs.clean_build }}" });
      const target = index === 0 ? "runtime" : "egress";
      expect(step.with?.["cache-from"]).toBe(`type=gha,version=2,scope=neska-ci-${target}-arm64`);
      expect(step.with?.["cache-to"]).toBe(`type=gha,version=2,scope=neska-ci-${target}-arm64,mode=max,ignore-error=true,timeout=2m`);
      expect(step.with?.tags).toBe(index === 0 ? "aibrain-ci:${{ github.sha }}" : "aibrain-egress-ci:${{ github.sha }}");
    }
    const commands = job.steps.map(step => step.run ?? "").join("\n");
    expect(commands.match(/docker image inspect/g)).toHaveLength(2);
    for (const script of ["container-app-server-acceptance", "container-browser-acceptance", "container-document-conversion-acceptance", "container-presentation-tool-acceptance", "container-xls-passive-acceptance", "scan-container-images"]) {
      const step = job.steps.find(step => step.run?.includes(script));
      expect(step).toBeDefined();
      expect(step?.if).toBeUndefined();
      expect(step?.["continue-on-error"]).toBeUndefined();
    }
  });

  it("blocks native container promotion on scanner failures and retains evidence", async () => {
    const job = (await readJobs()).containers;
    expect(job.strategy?.matrix.runner).toEqual(["ubuntu-24.04-arm"]);
    const scanner = job.steps.find((step) => step.run?.startsWith("bash scripts/scan-container-images.sh"));
    expect(scanner).toBeDefined();
    expect(scanner?.if).toBeUndefined();
    expect(scanner?.["continue-on-error"]).toBeUndefined();
    const reports = job.steps.find((step) => step.with?.name === "container-security-${{ matrix.runner }}-${{ github.sha }}");
    expect(reports?.if).toBe("always()");
    const script = await readFile(path.join(process.cwd(), "scripts/scan-container-images.sh"), "utf8");
    expect(script).toContain("--ignorefile /dev/null --severity CRITICAL --exit-code 1");
    expect(script).not.toContain("--ignore-unfixed");
    expect(script).toContain("exit \"$result\"");
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
