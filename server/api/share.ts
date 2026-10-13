import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  buildOrigin,
  escapeHtml,
  getAppBase,
  resolveContext,
  type ResolvedContext,
} from './_shared.js';

const CRAWLER_SIGNATURES = [
  'slack',
  'facebookexternalhit',
  'twitterbot',
  'discordbot',
  'linkedinbot',
  'whatsapp',
  'telegrambot',
  'embedly',
  'bot',
  'preview',
];

function isCrawler(userAgent: string | undefined): boolean {
  if (!userAgent) {
    return false;
  }
  const ua = userAgent.toLowerCase();
  return CRAWLER_SIGNATURES.some((signature) => ua.includes(signature));
}

function statusFromError(message: string): number {
  const lower = message.toLowerCase();
  if (lower.includes('not found') || lower.includes('no active sprint')) {
    return 404;
  }
  if (lower.includes('missing')) {
    return 400;
  }
  return 500;
}

function buildOgImageUrl(url: URL, context: ResolvedContext): string {
  const origin = buildOrigin(url);
  const ogUrl = new URL(`${origin}/og`);
  ogUrl.searchParams.set('sprint', context.sprint.id);
  ogUrl.searchParams.set('team', context.sprint.team_id);
  return ogUrl.toString();
}

function buildDescription(context: ResolvedContext): string {
  const { roles, members, sprint } = context;
  const memberById = new Map(members.map((member) => [member.id, member.name]));
  const assignments = sprint.assignments || {};

  const parts = roles
    .map((role) => {
      const memberId = assignments[role.id];
      const memberName = memberId ? memberById.get(memberId) : undefined;
      if (!memberName) {
        return null;
      }
      return `${role.name}: ${memberName}`;
    })
    .filter(Boolean) as string[];

  if (parts.length === 0) {
    return `Sprint roles for ${context.team.name}.`;
  }

  return parts.join(' · ');
}

function renderMetaHtml(options: {
  title: string;
  description: string;
  imageUrl: string;
  pageUrl: string;
  redirectUrl: string;
}): string {
  const { title, description, imageUrl, pageUrl, redirectUrl } = options;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${escapeHtml(imageUrl)}" />
  <meta property="og:url" content="${escapeHtml(pageUrl)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(imageUrl)}" />
</head>
<body>
  <p>Redirecting to <a href="${escapeHtml(redirectUrl)}">the presentation</a>.</p>
</body>
</html>`;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const teamId = url.searchParams.get('team');
    const sprintId = url.searchParams.get('sprint');

    const context = await resolveContext({ teamId, sprintId });
    const appBase = getAppBase(url);
    const redirectUrl = `${appBase}/presentation?replay=${context.sprint.id}`;

    if (isCrawler(req.headers['user-agent'])) {
      const title = `${context.team.name} · ${context.sprint.name}`;
      const description = buildDescription(context);
      const imageUrl = buildOgImageUrl(url, context);
      const html = renderMetaHtml({
        title,
        description,
        imageUrl,
        pageUrl: redirectUrl,
        redirectUrl,
      });

      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=300');
      res.end(html);
      return;
    }

    res.statusCode = 302;
    res.setHeader('Location', redirectUrl);
    res.end();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    res.statusCode = statusFromError(message);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end(message);
  }
}
