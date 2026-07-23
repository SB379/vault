import { NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { VAULT_ROOT } from "@/lib/vault";

const execFileAsync = promisify(execFile);

const LOCK_PATH = path.join(os.tmpdir(), "arxiv-research.lock");
const LOCK_MAX_AGE_MS = 15 * 60 * 1000;
const PIPELINE_BIN = path.join(VAULT_ROOT, "pipeline", ".venv", "bin", "arxiv-pipeline");
const PLIST_PATH = path.join(VAULT_ROOT, "pipeline", "com.sid.arxiv-pipeline.plist");

export async function POST() {
  // In-flight guard via lockfile.
  try {
    const stat = await fs.stat(LOCK_PATH);
    if (Date.now() - stat.mtimeMs < LOCK_MAX_AGE_MS) {
      return NextResponse.json({ status: "already_running" }, { status: 409 });
    }
  } catch {
    // no lockfile — proceed
  }

  try {
    await fs.writeFile(LOCK_PATH, String(process.pid));

    // Read the API key from the launchd plist. Never log or return it.
    const { stdout: keyOut } = await execFileAsync("/usr/libexec/PlistBuddy", [
      "-c",
      "Print :EnvironmentVariables:ANTHROPIC_API_KEY",
      PLIST_PATH,
    ]);
    const apiKey = keyOut.trim();
    if (!apiKey) {
      return NextResponse.json(
        { status: "error", message: "Could not read API key from plist" },
        { status: 500 }
      );
    }

    const { stdout } = await execFileAsync(
      PIPELINE_BIN,
      ["--research", "--vault", VAULT_ROOT],
      {
        env: { ...process.env, ANTHROPIC_API_KEY: apiKey },
        timeout: 10 * 60 * 1000, // research is slower — up to 10 minutes
      }
    );

    return NextResponse.json({ status: "ok", output: stdout.trim() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Market research failed";
    return NextResponse.json({ status: "error", message }, { status: 500 });
  } finally {
    await fs.unlink(LOCK_PATH).catch(() => {});
  }
}
