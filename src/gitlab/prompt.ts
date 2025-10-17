import { format } from "date-fns";
import type { GitLabChange, GitLabMergeRequest, GitLabNote } from "./types";
import type { GitLabContext } from "./context";

export type PromptData = {
  context: GitLabContext;
  mergeRequest: GitLabMergeRequest;
  changes: GitLabChange[];
  triggerNote: GitLabNote;
};

function formatTimestamp(dateString: string): string {
  try {
    return format(new Date(dateString), "yyyy-MM-dd HH:mmXXX");
  } catch (error) {
    return dateString;
  }
}

function formatChange(change: GitLabChange, maxLines: number): string {
  const headerParts = [] as string[];
  headerParts.push(`### ${change.new_path}`);
  const metadata: string[] = [];
  if (change.new_file) metadata.push("(new file)");
  if (change.deleted_file) metadata.push("(deleted file)");
  if (change.renamed_file) metadata.push("(renamed file)");
  if (metadata.length > 0) {
    headerParts.push(metadata.join(" "));
  }

  const diffLines = change.diff.split("\n");
  let truncated = false;
  if (diffLines.length > maxLines) {
    diffLines.length = maxLines;
    truncated = true;
  }

  const diffBody = diffLines
    .map((line) => line.replace(/```/g, "`\u200b``"))
    .join("\n");

  const diffSection = [
    headerParts.join(" "),
    "",
    "```diff",
    diffBody,
    truncated ? "\n... (diff truncated)" : "",
    "```",
  ]
    .filter(Boolean)
    .join("\n");

  return diffSection;
}

export function buildGitLabPrompt({
  context,
  mergeRequest,
  changes,
  triggerNote,
}: PromptData): string {
  const lines: string[] = [];
  lines.push(
    "You are Claude, an AI pair programmer helping with GitLab merge requests.",
  );
  lines.push("Focus on producing high-quality, actionable feedback.");
  lines.push("");
  lines.push("# Request Context");
  lines.push(`Trigger phrase: ${context.triggerPhrase}`);
  lines.push(
    `Triggered by: @${triggerNote.author.username} (${triggerNote.author.name})`,
  );
  lines.push(`Trigger time: ${formatTimestamp(triggerNote.created_at)}`);
  lines.push("");
  lines.push("## Trigger Comment");
  lines.push("" + triggerNote.body.trim());
  lines.push("");
  lines.push("# Merge Request");
  lines.push(`Title: ${mergeRequest.title}`);
  lines.push(`Author: @${mergeRequest.author.username}`);
  lines.push(`Source branch: ${mergeRequest.source_branch}`);
  lines.push(`Target branch: ${mergeRequest.target_branch}`);
  lines.push(`Web URL: ${mergeRequest.web_url}`);
  if (mergeRequest.diff_refs?.base_sha && mergeRequest.diff_refs?.head_sha) {
    lines.push(
      `Diff refs: ${mergeRequest.diff_refs.base_sha.slice(0, 8)}... -> ${mergeRequest.diff_refs.head_sha.slice(0, 8)}...`,
    );
  }

  if (mergeRequest.description && mergeRequest.description.trim() !== "") {
    lines.push("");
    lines.push("## Merge Request Description");
    lines.push(mergeRequest.description.trim());
  }

  if (changes.length > 0) {
    lines.push("");
    lines.push("# Changes");
    for (const change of changes) {
      lines.push("");
      lines.push(formatChange(change, context.maxDiffLines));
    }
  }

  lines.push("");
  lines.push("# Instructions");
  lines.push(
    "Provide a concise yet thorough review. Highlight critical issues, suggest improvements, and praise well-executed work. Use GitLab-flavored Markdown.",
  );
  if (context.jobUrl) {
    lines.push(
      "Include a reference to the job URL if useful: " + context.jobUrl,
    );
  }

  return lines.join("\n");
}
