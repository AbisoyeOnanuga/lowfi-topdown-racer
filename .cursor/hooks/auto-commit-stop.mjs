/**
 * Cursor `stop` hook: commit working tree after an agent session ends.
 * Requires git on PATH and a repo root. Fails open if nothing to commit.
 */
import { execSync } from "node:child_process";

/** Drain hook stdin without hanging when TTY or empty pipe. */
function drainStdin() {
  return new Promise((resolve) => {
    const done = () => resolve();
    const ms = 80;
    const timer = setTimeout(done, ms);
    if (!process.stdin.readable) {
      clearTimeout(timer);
      done();
      return;
    }
    try {
      process.stdin.setEncoding("utf8");
      let buf = "";
      process.stdin.on("data", (chunk) => {
        buf += chunk;
      });
      process.stdin.on("end", () => {
        clearTimeout(timer);
        done();
      });
      process.stdin.on("error", () => {
        clearTimeout(timer);
        done();
      });
    } catch {
      clearTimeout(timer);
      done();
    }
  });
}

function run() {
  try {
    execSync("git rev-parse --is-inside-work-tree", {
      stdio: "pipe",
      encoding: "utf8",
    });
  } catch {
    process.exit(0);
  }

  try {
    execSync("git add -A", { stdio: "pipe" });
    execSync("git diff --cached --quiet", { stdio: "pipe" });
    process.exit(0);
  } catch {
    /* staged changes exist */
  }

  const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
  const msg = `chore: cursor checkpoint ${stamp}`;
  try {
    execSync(`git commit -m ${JSON.stringify(msg)}`, {
      stdio: "inherit",
      shell: true,
    });
  } catch {
    /* hook must not block Cursor */
  }
  process.exit(0);
}

async function main() {
  await drainStdin();
  run();
}

main().catch(() => process.exit(0));
