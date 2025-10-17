#!/usr/bin/env bun

import { appendFileSync, existsSync, mkdirSync } from "fs";
import { dirname } from "path";
import { loadGitLabContext } from "./context";
import {
  fetchMergeRequest,
  fetchMergeRequestChanges,
  fetchMergeRequestNotes,
  postMergeRequestNote,
} from "./api";
import { buildGitLabPrompt } from "./prompt";
import { findLatestTrigger, createHandledMarker } from "./notes";
import { runClaudeWithPrompt } from "./claude";

async function ensureOutputFile(path: string) {
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  if (!existsSync(path)) {
    appendFileSync(path, "");
  }
}

async function main() {
  const context = loadGitLabContext();
  if (context.outputFile) {
    await ensureOutputFile(context.outputFile);
  }

  console.log("Loading merge request data from GitLab...");
  const [mergeRequest, notes] = await Promise.all([
    fetchMergeRequest(context),
    fetchMergeRequestNotes(context),
  ]);

  const triggerNote = findLatestTrigger(notes, context.triggerPhrase);

  if (!triggerNote) {
    console.log(
      `No trigger phrase \"${context.triggerPhrase}\" found in merge request notes. Skipping Claude execution.`,
    );
    return;
  }

  console.log(
    `Trigger note ${triggerNote.id} by @${triggerNote.author.username} detected. Preparing prompt...`,
  );

  const changes = await fetchMergeRequestChanges(context);
  const prompt = buildGitLabPrompt({
    context,
    mergeRequest,
    changes,
    triggerNote,
  });

  console.log("Running Claude CLI...");
  const claudeOutput = await runClaudeWithPrompt(prompt, {
    claudeArgs: context.claudeArgs,
    claudeExecutable: context.claudeExecutable,
  });

  const marker = createHandledMarker(triggerNote.id);
  const jobFooter = context.jobUrl
    ? `\n\n——\nTriggered from ${context.jobUrl}`
    : "";
  const commentBody = `${marker}\n${claudeOutput}${jobFooter}`.trim();

  console.log("Posting Claude response to GitLab...");
  const note = await postMergeRequestNote(context, commentBody);

  if (context.outputFile) {
    appendFileSync(context.outputFile, `CLAUDE_NOTE_ID=${note.id}\n`);
  }

  console.log(`Claude response posted as note ${note.id}.`);
}

main().catch((error) => {
  console.error("GitLab Claude workflow failed:", error);
  process.exit(1);
});
