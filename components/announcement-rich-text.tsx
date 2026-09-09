'use client';

import { marked } from 'marked';

marked.setOptions({
  breaks: true,
  gfm: true,
});

export default function AnnouncementRichText({
  body,
  className,
}: {
  body: string;
  className?: string;
}) {
  const html = marked.parse(body, { async: false }) as string;

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
