/**
 * Read the words printed on a Facebook photo or story still.
 * The image is downloaded here and sent to the vision model, because Facebook
 * image links expire and are often unreachable from OpenAI's servers.
 */

const MAX_BYTES = 8 * 1024 * 1024;
const DEFAULT_MODEL = 'gpt-5.4-mini';
let missingKeyWarned = false;

const PROMPT = [
  'Read every word visible in this image.',
  'The image is a Facebook post or story from a bar. It may be a food special or a Broncos pot luck.',
  'Return only the words you can see, in reading order, keeping line breaks.',
  'Do not describe the picture. If there are no words, reply with exactly NONE.',
].join(' ');

export async function readImageText(imageUrl: string): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    if (!missingKeyWarned) {
      console.error('Photo text skipped. Set OPENAI_API_KEY.');
      missingKeyWarned = true;
    }
    return null;
  }

  const image = await downloadImage(imageUrl);
  if (!image) return null;

  const model = process.env.OPENAI_MODEL?.trim() || DEFAULT_MODEL;
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_completion_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: PROMPT },
            {
              type: 'image_url',
              image_url: { url: `data:${image.mime};base64,${image.base64}`, detail: 'high' },
            },
          ],
        },
      ],
    }),
    signal: AbortSignal.timeout(25_000),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = data?.error?.message || response.statusText;
    console.error('Photo text failed:', message);
    return null;
  }
  return textFromVisionResponse(data);
}

export function textFromVisionResponse(data: {
  choices?: Array<{ message?: { content?: unknown } }>;
} | null): string | null {
  const content = data?.choices?.[0]?.message?.content;
  const text = typeof content === 'string'
    ? content
    : Array.isArray(content)
      ? content
          .map((part) => (part && typeof part === 'object' && 'text' in part ? String(part.text || '') : ''))
          .join('')
      : '';
  const trimmed = text.replace(/\r/g, '').trim();
  if (!trimmed || /^none[.!]?$/i.test(trimmed)) return null;
  return trimmed;
}

async function downloadImage(imageUrl: string): Promise<{ mime: string; base64: string } | null> {
  try {
    const response = await fetch(imageUrl, { signal: AbortSignal.timeout(15_000) });
    if (!response.ok) {
      console.error('Photo download failed:', response.status);
      return null;
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength < 32 || bytes.byteLength > MAX_BYTES) return null;
    const mime = imageMime(bytes, response.headers.get('content-type'));
    if (!mime) return null;
    return { mime, base64: Buffer.from(bytes).toString('base64') };
  } catch (error) {
    console.error('Photo download failed:', error);
    return null;
  }
}

function imageMime(bytes: Uint8Array, header: string | null): string | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'image/jpeg';
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png';
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return 'image/gif';
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp';
  }
  const declared = (header || '').split(';')[0].trim().toLowerCase();
  if (declared.startsWith('image/')) return declared;
  return null;
}
