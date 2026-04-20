/**
 * Reduce reply-all noise: keep the user's new message, drop typical quoted thread tails
 * (Gmail "On … wrote:", Outlook separators, trailing >-quoted lines).
 */
export function extractConversationReplyPreview(body: string): string {
  if (!body?.trim()) return '';
  let text = body.replace(/\r\n/g, '\n');

  // Gmail English (incl. HTML→text flattened to one line): "...? On Mon, Apr 20, ... wrote:"
  // Must run before the newline-only rule — plainTextFromHtml collapses <br> to spaces.
  const gmailOnWrote =
    /(?:^|\s)On\s+(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),\s[\s\S]+?wrote:\s*/i;
  let gw = text.match(gmailOnWrote);
  if (gw?.index !== undefined) {
    text = text.slice(0, gw.index);
  }

  // Gmail / Apple Mail (multiline plain text): "On … wrote:" after line break or start
  const onWrote = /(?:^|\n)On\s[^\n]{10,}?wrote:\s*/i;
  const ow = text.match(onWrote);
  if (ow?.index !== undefined) {
    text = text.slice(0, ow.index);
  }

  // Outlook / others
  const origMsg = /\n-{5,}\s*Original Message\s*-{5,}\s*\n/i;
  const om = text.match(origMsg);
  if (om?.index !== undefined) {
    text = text.slice(0, om.index);
  }

  const forwarded = /\n-{5,}\s*Forwarded message\s*-{5,}\s*\n/i;
  const fw = text.match(forwarded);
  if (fw?.index !== undefined) {
    text = text.slice(0, fw.index);
  }

  // Drop trailing block of quoted lines (starts with >)
  let lines = text.split('\n');
  while (lines.length && lines[lines.length - 1].trim().startsWith('>')) {
    lines.pop();
  }

  // Safety: attribution line left over (wrapping, odd spacing, or partial match)
  lines = lines.filter(
    (line) => !/^\s*On\s+(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),\s.+wrote:\s*$/i.test(line.trim()),
  );
  lines = lines.filter((line) => !/^\s*On\s.+wrote:\s*$/i.test(line.trim()));

  text = lines.join('\n');

  const trimmed = text.trim();
  if (!trimmed) return body.trim();
  return trimmed;
}
