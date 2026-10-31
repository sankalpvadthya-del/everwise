export function normalizeAnswer(value: string) {
  return value.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function oneTypo(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  if (a.length === b.length) {
    const different = [...a].flatMap((c, i) => c === b[i] ? [] : [i]);
    if (different.length === 1) return true;
    const [i, j] = different;
    return different.length === 2 && i !== undefined && j === i + 1 && a[i] === b[j] && a[j] === b[i];
  }
  const shorter = a.length < b.length ? a : b;
  const longer = a.length < b.length ? b : a;
  for (let i = 0; i < longer.length; i++) if (longer.slice(0, i) + longer.slice(i + 1) === shorter) return true;
  return false;
}

/** Only correct a single spelling slip in an otherwise identical answer. Never alter numbers or short terms. */
export function correctRecallTypo(answer: string, expected: string, enabled = true): string | null {
  if (!enabled) return null;
  const a = normalizeAnswer(answer).split(" ");
  const b = normalizeAnswer(expected).split(" ");
  if (a.length !== b.length) return null;
  let changes = 0;
  for (let i = 0; i < a.length; i++) {
    const left = a[i]; const right = b[i];
    if (left === undefined || right === undefined) return null;
    if (left === right) continue;
    if (left.length < 5 || right.length < 5 || /\d/u.test(left + right) || !oneTypo(left, right)) return null;
    changes++;
  }
  return changes === 1 ? expected : null;
}