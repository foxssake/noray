import * as rl from "node:readline/promises";
import * as chp from "node:child_process";
import { fail } from "node:assert";

function sleep(t: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, t));
}

/**
 * Run taplog
 * @param tapFormat Command for TAP formatting
 * @param logFormat Command for log formatting
 */
async function taplog(tapFormat: string, logFormat: string) {
  const reader = rl.createInterface({
    input: process.stdin,
  });

  const tapLines = [] as string[];
  const tap = chp.exec(tapFormat);
  const log = chp.exec(logFormat);

  if (tap.stdout == null) fail("Tap process has no stdout!");
  if (log.stdout == null) fail("Log process has no stdout!");
  if (tap.stdin == null) fail("Tap process has no stdin!");
  if (log.stdin == null) fail("Log process has no stdin!");

  let testPass = true;

  tap.stdout.pipe(process.stdout);
  log.stdout.pipe(process.stdout);

  reader.on("line", (line) => {
    const logRegex = /^\s*#*\s*{/;
    const failRegex = /\s*not ok \d+/;

    if (logRegex.test(line)) {
      log.stdin?.write(line.replace(logRegex, "{") + "\n");
    } else {
      tapLines.push(line);

      testPass &&= !failRegex.test(line);
    }
  });

  reader.on("close", async () => {
    tapLines.forEach((line) => tap.stdin?.write(line + "\n"));
    await sleep(25);

    tap.kill();
    log.kill();

    process.exit(testPass ? 0 : 1);
  });
}

taplog(process.argv[2], process.argv[3]);
