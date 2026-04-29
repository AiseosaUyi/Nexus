// Brevo (https://api.brevo.com) transactional email sender.
// Direct REST instead of @getbrevo/brevo SDK to keep serverless bundles small.

const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';

type SendResult = { success: true; id?: string } | { error: string };

function getEnv() {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME || 'Nexus';

  if (!apiKey || !senderEmail) {
    if (typeof window === 'undefined') {
      console.warn('[Email] BREVO_API_KEY or BREVO_SENDER_EMAIL not set — emails will not be sent');
    }
    return null;
  }
  return { apiKey, senderEmail, senderName };
}

async function sendBrevoEmail(opts: {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: { email: string; name?: string };
}): Promise<SendResult> {
  const env = getEnv();
  if (!env) return { error: 'Email not configured' };

  try {
    const res = await fetch(BREVO_ENDPOINT, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'api-key': env.apiKey,
      },
      body: JSON.stringify({
        sender: { email: env.senderEmail, name: env.senderName },
        to: [{ email: opts.to, ...(opts.toName ? { name: opts.toName } : {}) }],
        subject: opts.subject,
        htmlContent: opts.html,
        ...(opts.text ? { textContent: opts.text } : {}),
        ...(opts.replyTo ? { replyTo: opts.replyTo } : {}),
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error('[Email] Brevo error', res.status, body);
      return { error: `Brevo ${res.status}: ${body.slice(0, 200)}` };
    }

    const data = (await res.json().catch(() => ({}))) as { messageId?: string };
    return { success: true, id: data.messageId };
  } catch (err) {
    console.error('[Email] Brevo fetch failed', err);
    return { error: err instanceof Error ? err.message : 'fetch failed' };
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderEmailLayout(opts: {
  preheader: string;
  headline: string;
  bodyHtml: string;
  ctaLabel: string;
  ctaUrl: string;
  footerNote?: string;
}): string {
  // Mobile-first email-safe layout. Table-based for max compatibility.
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escapeHtml(opts.headline)}</title>
<style>
  @media (prefers-color-scheme: dark) {
    body, .bg { background: #0a0a0a !important; }
    .card { background: #141414 !important; border-color: #222 !important; }
    .h1 { color: #fff !important; }
    .body { color: #c4c4c4 !important; }
    .muted { color: #777 !important; }
  }
</style>
</head>
<body class="bg" style="margin:0;padding:0;background:#fafafa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(opts.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;">
  <tr>
    <td align="center" style="padding:40px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="card" style="max-width:480px;background:#ffffff;border:1px solid #ececec;border-radius:14px;overflow:hidden;">
        <tr>
          <td style="padding:32px 32px 16px;">
            <div style="display:inline-flex;align-items:center;gap:10px;">
              <span style="display:inline-flex;width:32px;height:32px;background:#111;border-radius:7px;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:14px;letter-spacing:-0.02em;">N</span>
              <span style="font-weight:600;font-size:15px;color:#111;">Nexus</span>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 32px 8px;">
            <h1 class="h1" style="margin:0 0 12px;font-size:22px;font-weight:700;line-height:1.3;color:#111;letter-spacing:-0.01em;">${opts.headline}</h1>
            <div class="body" style="font-size:15px;line-height:1.6;color:#555;">${opts.bodyHtml}</div>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 32px 8px;">
            <a href="${escapeHtml(opts.ctaUrl)}" style="display:inline-block;background:#111;color:#ffffff;padding:12px 22px;border-radius:9px;text-decoration:none;font-size:14px;font-weight:600;">
              ${escapeHtml(opts.ctaLabel)}
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 32px 32px;">
            <div class="muted" style="font-size:12px;color:#9a9a9a;line-height:1.6;word-break:break-all;">
              Or open this link directly:<br />
              <a href="${escapeHtml(opts.ctaUrl)}" style="color:#9a9a9a;">${escapeHtml(opts.ctaUrl)}</a>
            </div>
            ${
              opts.footerNote
                ? `<div class="muted" style="margin-top:16px;font-size:12px;color:#9a9a9a;line-height:1.6;">${opts.footerNote}</div>`
                : ''
            }
          </td>
        </tr>
      </table>
      <div style="margin-top:18px;font-size:11px;color:#aaa;">Sent by Nexus</div>
    </td>
  </tr>
</table>
</body>
</html>`;
}

// ─── Team Invite ────────────────────────────────────────────────────────────

export async function sendTeamInviteEmail({
  to,
  inviterName,
  workspaceName,
  role,
  acceptUrl,
}: {
  to: string;
  inviterName: string;
  workspaceName: string;
  role: string;
  acceptUrl: string;
}): Promise<SendResult> {
  const roleLabel = role === 'ADMIN' ? 'Admin' : role === 'EDITOR' ? 'Member' : 'Guest';
  const html = renderEmailLayout({
    preheader: `${inviterName} invited you to ${workspaceName} on Nexus`,
    headline: `Join ${escapeHtml(workspaceName)} on Nexus`,
    bodyHtml: `<strong>${escapeHtml(inviterName)}</strong> invited you to join as a <strong>${roleLabel}</strong>.`,
    ctaLabel: 'Accept invitation',
    ctaUrl: acceptUrl,
    footerNote: `This invitation expires in 7 days. If you weren't expecting it, you can ignore this email.`,
  });

  return sendBrevoEmail({
    to,
    subject: `${inviterName} invited you to ${workspaceName} on Nexus`,
    html,
    text: `${inviterName} invited you to join ${workspaceName} as a ${roleLabel}. Accept: ${acceptUrl}`,
  });
}

// ─── Page Share ─────────────────────────────────────────────────────────────

export async function sendPageShareEmail({
  to,
  inviterName,
  pageTitle,
  pageUrl,
}: {
  to: string;
  inviterName: string;
  pageTitle: string;
  pageUrl: string;
}): Promise<SendResult> {
  const html = renderEmailLayout({
    preheader: `${inviterName} shared "${pageTitle}" with you on Nexus`,
    headline: `${escapeHtml(inviterName)} shared a page with you`,
    bodyHtml: `You've been given access to <strong>"${escapeHtml(pageTitle)}"</strong>.`,
    ctaLabel: 'Open page',
    ctaUrl: pageUrl,
    footerNote: `If you don't have a Nexus account, you'll be asked to sign up first.`,
  });

  return sendBrevoEmail({
    to,
    subject: `${inviterName} shared "${pageTitle}" with you on Nexus`,
    html,
    text: `${inviterName} shared "${pageTitle}" with you. Open: ${pageUrl}`,
  });
}

// ─── Comment / Mention Notification ─────────────────────────────────────────

export async function sendCommentNotificationEmail({
  to,
  toName,
  commenterName,
  documentName,
  commentSnippet,
  commentUrl,
}: {
  to: string;
  toName?: string;
  commenterName: string;
  documentName: string;
  commentSnippet: string;
  commentUrl: string;
}): Promise<SendResult> {
  const trimmed = commentSnippet.length > 240 ? commentSnippet.slice(0, 240).trimEnd() + '…' : commentSnippet;

  const html = renderEmailLayout({
    preheader: `${commenterName} mentioned you in ${documentName}`,
    headline: `${escapeHtml(commenterName)} mentioned you`,
    bodyHtml: `
      <div style="margin:0 0 16px;">In <strong>${escapeHtml(documentName)}</strong>:</div>
      <blockquote style="margin:0;padding:14px 18px;background:#f6f6f6;border-left:3px solid #111;border-radius:0 8px 8px 0;color:#333;font-size:14px;line-height:1.55;">
        ${escapeHtml(trimmed)}
      </blockquote>
    `,
    ctaLabel: 'View comment',
    ctaUrl: commentUrl,
  });

  return sendBrevoEmail({
    to,
    toName,
    subject: `${commenterName} mentioned you in ${documentName}`,
    html,
    text: `${commenterName} mentioned you in ${documentName}: "${trimmed}". View: ${commentUrl}`,
  });
}
