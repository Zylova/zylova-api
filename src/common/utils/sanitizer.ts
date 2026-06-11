export function sanitize(input: string): string {
  return input
    .replace(/<[^>]*>/g, '')
    .replace(/[<>]/g, '')
    .trim();
}

export function sanitizeOptional(input?: string | null): string | undefined {
  if (!input) return undefined;
  return sanitize(input);
}
