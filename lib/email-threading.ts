/** Helpers for CRM “Reply” prefilling (client). */

export function extractBareEmail(value: string): string {
  const raw = value.trim();
  const m = raw.match(/<([^>]+)>/);
  return (m ? m[1] : raw).trim().toLowerCase();
}

export function inferReplyRecipient(parent: {
  direction: string;
  from: string;
  to: string;
}, leadEmail: string): string | null {
  const lead = leadEmail.trim().toLowerCase();
  if (parent.direction === 'inbound') {
    const addr = extractBareEmail(parent.from);
    if (addr) return addr;
    return lead || null;
  }
  const parts = parent.to.split(/[,;]/).map((p) => extractBareEmail(p)).filter(Boolean);
  const preferred = parts.find((e) => e === lead);
  if (preferred) return preferred;
  if (parts[0]) return parts[0];
  return lead || null;
}

export function replyEmailSubject(parentSubject: string): string {
  const s = parentSubject.trim();
  if (!s) return 'Re: (no subject)';
  if (/^(re|fwd|fw)\s*:\s*/i.test(s)) return s;
  return `Re: ${s}`;
}
