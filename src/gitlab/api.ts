import fetch from "node-fetch";
import type { RequestInit } from "node-fetch";
import type {
  GitLabChange,
  GitLabMergeRequest,
  GitLabNote,
  GitLabNoteListResponse,
} from "./types";
import type { GitLabContext } from "./context";

function buildHeaders(token: string) {
  return {
    "Content-Type": "application/json",
    "PRIVATE-TOKEN": token,
  };
}

async function gitlabRequest<T>(
  context: GitLabContext,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const url = `${context.apiUrl.replace(/\/?$/, "")}${path}`;
  const response = await fetch(url, {
    ...init,
    headers: {
      ...buildHeaders(context.token),
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `GitLab API request failed (${response.status} ${response.statusText}): ${text}`,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function projectPath(projectId: string): string {
  return encodeURIComponent(projectId);
}

export async function fetchMergeRequest(
  context: GitLabContext,
): Promise<GitLabMergeRequest> {
  return gitlabRequest<GitLabMergeRequest>(
    context,
    `/projects/${projectPath(context.projectId)}/merge_requests/${context.mergeRequestIid}`,
  );
}

export async function fetchMergeRequestChanges(
  context: GitLabContext,
): Promise<GitLabChange[]> {
  const result = await gitlabRequest<{ changes: GitLabChange[] }>(
    context,
    `/projects/${projectPath(context.projectId)}/merge_requests/${context.mergeRequestIid}/changes`,
  );
  return result.changes || [];
}

export async function fetchMergeRequestNotes(
  context: GitLabContext,
): Promise<GitLabNoteListResponse> {
  return gitlabRequest<GitLabNoteListResponse>(
    context,
    `/projects/${projectPath(context.projectId)}/merge_requests/${context.mergeRequestIid}/notes?per_page=100`,
  );
}

export async function postMergeRequestNote(
  context: GitLabContext,
  body: string,
): Promise<GitLabNote> {
  return gitlabRequest<GitLabNote>(
    context,
    `/projects/${projectPath(context.projectId)}/merge_requests/${context.mergeRequestIid}/notes`,
    {
      method: "POST",
      body: JSON.stringify({ body }),
    },
  );
}
