import { mkdtemp, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { spawn } from "child_process";
import { parse as parseShellArgs } from "shell-quote";

export type ClaudeRunOptions = {
  claudeArgs?: string;
  claudeExecutable?: string;
  env?: Record<string, string>;
};

export async function runClaudeWithPrompt(
  prompt: string,
  options: ClaudeRunOptions,
): Promise<string> {
  const tempDir = await mkdtemp(join(tmpdir(), "claude-gitlab-"));
  const promptPath = join(tempDir, "prompt.txt");
  await writeFile(promptPath, prompt, "utf8");

  const claudeExecutable = options.claudeExecutable || "claude";
  const args: string[] = ["-p", promptPath, "--output-format", "markdown"];

  if (options.claudeArgs && options.claudeArgs.trim() !== "") {
    const parsedArgs = parseShellArgs(options.claudeArgs).filter(
      (part): part is string => typeof part === "string",
    );
    args.splice(1, 0, ...parsedArgs);
  }

  const child = spawn(claudeExecutable, args, {
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      ...(options.env || {}),
    },
  });

  let stdout = "";
  let stderr = "";

  child.stdout.on("data", (chunk) => {
    stdout += chunk.toString();
  });

  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  const exitCode: number = await new Promise((resolve) => {
    child.on("close", (code) => resolve(code ?? 0));
    child.on("error", () => resolve(1));
  });

  if (exitCode !== 0) {
    throw new Error(
      `Claude CLI exited with code ${exitCode}. Stderr: ${stderr.trim()}`,
    );
  }

  return stdout.trim();
}
