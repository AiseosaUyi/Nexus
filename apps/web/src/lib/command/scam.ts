// Heuristic scam/spam scorer for inbound freelance opportunities.
// Returns 0-100. >= 60 => quarantine. Shared by server actions and API routes.
// (Aise was targeted on Dribbble by a fake recruiter asking to "test a link".)
const RED_FLAGS: [RegExp, number, string][] = [
  [/\b(test|click|verify|open)\b.{0,20}\b(link|url)\b/i, 35, 'asks you to open/test a link'],
  [/\b(whats ?app|telegram|hangouts|signal)\b/i, 20, 'pushes to off-platform chat'],
  [/\b(crypto|usdt|bitcoin|wallet|nft mint)\b/i, 30, 'crypto / wallet ask'],
  [/\b(gift ?card|western union|zelle|cash ?app)\b/i, 30, 'irregular payment method'],
  [/\b(seed phrase|password|2fa|verification code)\b/i, 45, 'asks for credentials'],
  [/\b(urgent|asap|immediately|right now)\b/i, 10, 'artificial urgency'],
  [/\b(no experience needed|guaranteed income)\b/i, 25, 'too-good-to-be-true offer'],
  [/(bit\.ly|tinyurl|forms\.gle|t\.co)\//i, 15, 'shortened link'],
  [/\b(dm me|message me on)\b/i, 8, 'redirect to DMs'],
];

export function scoreScam(text = ''): { scam_score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];
  for (const [re, weight, label] of RED_FLAGS) {
    if (re.test(text)) { score += weight; reasons.push(label); }
  }
  return { scam_score: Math.min(100, score), reasons };
}
