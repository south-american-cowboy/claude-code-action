import type { GitLabNote } from "./types";

export function findLatestTrigger(
  notes: GitLabNote[],
  triggerPhrase: string,
): GitLabNote | null {
  const normalizedTrigger = triggerPhrase.trim().toLowerCase();
  const handledMarkers = new Set(
    notes
      .filter((note) => note.body.includes("<!-- claude:handled-note:"))
      .map((note) => {
        const match = note.body.match(/<!-- claude:handled-note:(\d+) -->/);
        return match ? match[1] : undefined;
      })
      .filter((id): id is string => Boolean(id)),
  );

  const sorted = [...notes].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  for (const note of sorted) {
    if (!note.body) continue;
    if (handledMarkers.has(String(note.id))) {
      continue;
    }
    if (note.body.toLowerCase().includes(normalizedTrigger)) {
      return note;
    }
  }

  return null;
}

export function createHandledMarker(noteId: number): string {
  return `<!-- claude:handled-note:${noteId} -->`;
}
