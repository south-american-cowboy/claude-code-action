import { join } from "path";
import { tmpdir } from "os";

export type GitLabContext = {
  projectId: string;
  mergeRequestIid: string;
  token: string;
  apiUrl: string;
  triggerPhrase: string;
  claudeArgs?: string;
  claudeExecutable?: string;
  jobUrl?: string;
  pipelineUrl?: string;
  maxDiffLines: number;
  outputFile?: string;
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function loadGitLabContext(): GitLabContext {
  const projectId =
    process.env.CI_PROJECT_ID || process.env.CLAUDE_GITLAB_PROJECT_ID;
  const mergeRequestIid =
    process.env.CI_MERGE_REQUEST_IID || process.env.CLAUDE_GITLAB_MR_IID;

  if (!projectId) {
    throw new Error(
      "Unable to determine GitLab project. Set CI_PROJECT_ID or CLAUDE_GITLAB_PROJECT_ID.",
    );
  }

  if (!mergeRequestIid) {
    throw new Error(
      "Unable to determine merge request IID. Set CI_MERGE_REQUEST_IID or CLAUDE_GITLAB_MR_IID.",
    );
  }

  const token = requireEnv("GITLAB_TOKEN");

  const apiUrl =
    process.env.GITLAB_API_URL ||
    (process.env.CI_SERVER_URL
      ? `${process.env.CI_SERVER_URL.replace(/\/?$/, "")}/api/v4`
      : "https://gitlab.com/api/v4");

  const triggerPhrase = process.env.CLAUDE_GITLAB_TRIGGER_PHRASE || "@claude";

  const claudeArgs = process.env.CLAUDE_GITLAB_CLAUDE_ARGS;
  const claudeExecutable = process.env.CLAUDE_GITLAB_CLAUDE_PATH;

  const jobUrl = process.env.CI_JOB_URL;
  const pipelineUrl = process.env.CI_PIPELINE_URL;
  const outputFile = process.env.GITLAB_OUTPUT_FILE;

  const maxDiffLines = (() => {
    const raw = process.env.CLAUDE_GITLAB_MAX_DIFF_LINES;
    if (!raw) return 400;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 400;
  })();

  if (!process.env.RUNNER_TEMP) {
    const fallbackTemp = join(tmpdir(), "claude-gitlab-temp");
    process.env.RUNNER_TEMP = fallbackTemp;
  }

  return {
    projectId,
    mergeRequestIid,
    token,
    apiUrl,
    triggerPhrase,
    claudeArgs,
    claudeExecutable,
    jobUrl,
    pipelineUrl,
    maxDiffLines,
    outputFile,
  };
}
