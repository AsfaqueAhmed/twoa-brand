export interface OrderNote {
  id: string;
  orderId: string;
  note: string;
  createdAt: string;
}

export function normalizeNote(note: string): string {
  const trimmed = note.trim();
  if (!trimmed) throw new Error('Note cannot be empty.');
  return trimmed;
}
