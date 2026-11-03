import { describe, expect, it } from "vitest";
import { isApprovalItem, type ApprovalItem } from "@/lib/chat-contract";
import { classifyApprovalRisk, classifyCommand, narrowDecisionForRisk } from "@/runtime/approval-risk";
import { approvalFromRequest } from "@/runtime/codex-app-server";

const level = (command: string | null) => classifyCommand(command).level;

describe("approval risk levels", () => {
  it("treats only plain reads as contained", () => {
    expect(level("ls -la")).toBe("contained");
    expect(level("cat README.md | grep Neska | wc -l")).toBe("contained");
    expect(level("git status && git diff")).toBe("contained");
    expect(level("LANG=C sort notes.txt")).toBe("contained");
  });

  it("falls to wide for anything unknown, redirected or substituted", () => {
    expect(level(null)).toBe("wide");
    expect(level("")).toBe("wide");
    expect(level("npm install")).toBe("wide");
    expect(level("python3 script.py")).toBe("wide");
    expect(level("cat a > b")).toBe("wide");
    expect(level("echo $(whoami)")).toBe("wide");
    expect(level("ls & python3 script.py")).toBe("wide");
    expect(level("cat <(python3 script.py)")).toBe("wide");
    expect(level("cat < notes.txt")).toBe("wide");
    expect(level("echo ${HOME}")).toBe("wide");
    expect(level("ls\npython3 x.py")).toBe("wide");
    expect(level("ls; node build.js")).toBe("wide");
    expect(level("git checkout main")).toBe("wide");
    expect(level("sort -o invoices.csv replacement.csv")).toBe("wide");
    expect(level("sort --output=invoices.csv a.csv")).toBe("wide");
    expect(level("tree -o out.txt")).toBe("wide");
    expect(level("find . -fprint list.txt")).toBe("wide");
    expect(level("git log --output=log.txt")).toBe("wide");
    expect(level("git branch feature")).toBe("wide");
    expect(level("git branch -a")).toBe("contained");
    expect(level("grep -o F-2026 factures.csv")).toBe("contained");
  });

  it("marks deletes, outbound sends and system changes as irreversible", () => {
    for (const command of [
      "rm -rf build", "find . -name '*.tmp' -delete", "find . -exec rm {} \\;",
      "git push origin main", "git reset --hard HEAD~1", "npm publish",
      "curl -X POST https://example.test/api", "curl -d 'a=1' https://example.test",
      "scp file host:/tmp", "sudo apt install x", "kill 1234", "psql -c 'DROP TABLE users'",
      "ls && rm notes.txt", "git branch -D unsaved-work", "git branch --delete old",
    ]) {
      expect(level(command), command).toBe("irreversible");
    }
  });

  it("classifies non-command approvals by blast radius", () => {
    expect(classifyApprovalRisk({ kind: "file" }).level).toBe("wide");
    expect(classifyApprovalRisk({ kind: "permissions", networkEnabled: false }).level).toBe("wide");
    expect(classifyApprovalRisk({ kind: "permissions", networkEnabled: true }).level).toBe("irreversible");
    expect(classifyApprovalRisk({ kind: "connector" }).level).toBe("irreversible");
    expect(classifyApprovalRisk({ kind: "browser" }).level).toBe("irreversible");
  });

  it("counts network or extra permissions requested with a command", () => {
    expect(classifyApprovalRisk({ kind: "command", command: "python3 script.py", networkEnabled: true }).level).toBe("irreversible");
    expect(classifyApprovalRisk({ kind: "command", command: "ls", networkEnabled: true }).level).toBe("irreversible");
    expect(classifyApprovalRisk({ kind: "command", command: "ls", extraPermissions: true }).level).toBe("wide");
    const withNetwork = approvalFromRequest({
      id: 8,
      method: "item/commandExecution/requestApproval",
      params: { threadId: "thread_1", turnId: "turn_1", itemId: "item_2", command: "python3 script.py", additionalPermissions: { network: { enabled: true }, fileSystem: null } },
    } as never);
    expect(withNetwork?.item.risk?.level).toBe("irreversible");
    const withContext = approvalFromRequest({
      id: 9,
      method: "item/commandExecution/requestApproval",
      params: { threadId: "thread_1", turnId: "turn_1", itemId: "item_3", command: "ls", networkApprovalContext: { host: "example.test" } },
    } as never);
    expect(withContext?.item.risk?.level).toBe("irreversible");
  });

  it("narrows session scope to one approval unless the action is reversible", () => {
    const withLevel = (risk?: ApprovalItem["risk"]) => ({ risk });
    expect(narrowDecisionForRisk("acceptForSession", withLevel({ level: "irreversible", reason: "x" }))).toBe("accept");
    expect(narrowDecisionForRisk("acceptForSession", withLevel(undefined))).toBe("accept");
    expect(narrowDecisionForRisk("acceptForSession", withLevel({ level: "wide", reason: "x" }))).toBe("acceptForSession");
    expect(narrowDecisionForRisk("acceptForSession", withLevel({ level: "contained", reason: "x" }))).toBe("acceptForSession");
    // Narrowing never turns a refusal into an approval.
    expect(narrowDecisionForRisk("decline", withLevel({ level: "irreversible", reason: "x" }))).toBe("decline");
    expect(narrowDecisionForRisk("cancel", withLevel({ level: "contained", reason: "x" }))).toBe("cancel");
  });

  it("attaches a valid risk to App Server approval requests", () => {
    const pending = approvalFromRequest({
      id: 7,
      method: "item/commandExecution/requestApproval",
      params: { threadId: "thread_1", turnId: "turn_1", itemId: "item_1", command: "rm -rf out" },
    } as never);
    expect(pending?.item.risk?.level).toBe("irreversible");
    expect(isApprovalItem(pending?.item)).toBe(true);
  });

  it("rejects malformed risk data in the contract", () => {
    const base: ApprovalItem = {
      id: "approval_1", threadId: "thread_1", turnId: "turn_1", itemId: "item_1",
      kind: "command", title: "t", detail: "d", status: "pending",
    };
    expect(isApprovalItem(base)).toBe(true);
    expect(isApprovalItem({ ...base, risk: { level: "wide", reason: "ok" } })).toBe(true);
    expect(isApprovalItem({ ...base, risk: { level: "safe", reason: "ok" } })).toBe(false);
    expect(isApprovalItem({ ...base, risk: { level: "wide", reason: "" } })).toBe(false);
    expect(isApprovalItem({ ...base, risk: { level: "wide", reason: "ok", grant: true } })).toBe(false);
  });
});
