export type GitLabUser = {
  id: number;
  username: string;
  name: string;
  avatar_url?: string;
};

export type GitLabNote = {
  id: number;
  body: string;
  author: GitLabUser;
  created_at: string;
  discussion_id?: string;
};

export type GitLabMergeRequest = {
  iid: number;
  project_id: number;
  title: string;
  description: string | null;
  state: string;
  web_url: string;
  target_branch: string;
  source_branch: string;
  diff_refs?: {
    base_sha?: string;
    start_sha?: string;
    head_sha?: string;
  };
  author: GitLabUser;
};

export type GitLabChange = {
  old_path: string;
  new_path: string;
  diff: string;
  new_file: boolean;
  renamed_file: boolean;
  deleted_file: boolean;
};

export type GitLabNoteListResponse = GitLabNote[];

export type GitLabChangesResponse = {
  changes: GitLabChange[];
};

export type GitLabCommentPayload = {
  body: string;
  created_at?: string;
};
