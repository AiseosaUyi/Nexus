# Scam / spam filter

Aise was scammed on Dribbble by a fake "recruiter" who wanted links tested. Treat inbound with
healthy suspicion. The server auto-scores these; your job is to catch what regex misses.

## Auto-quarantine signals (any 2 = treat as scam)

- Asks you to **click / test / verify a link**, install something, or run a script.
- Pushes off-platform fast: "message me on Telegram/WhatsApp/Signal."
- Payment via crypto/USDT/wallet, gift cards, Zelle/CashApp, or "I'll send you money first."
- Asks for logins, seed phrases, 2FA codes, or wallet connect.
- "No experience needed / earn $X per day / guaranteed."
- Vague brief + heavy urgency ("start today," "urgent").
- Recruiter with a shortened/off-brand link (bit.ly, forms.gle) instead of a real company domain.
- Overpayment / "refund the difference" setups.

## What to do

- Capture it with `cc_capture_opportunity` and its full text — the server quarantines score ≥ 60.
- Do NOT write a genuine reply. Leave `draft_reply` empty for quarantined items.
- In the note, say why it's flagged so Aise can confirm in one glance.
- If it's borderline (score 40-59), draft a **safe, non-committal** reply that asks them to keep it
  on-platform and share a real brief/budget — never agrees to click anything.

## Legit-but-careful

Real clients sometimes sound informal. If the profile is established, has reviews, names a real
company, and the ask is normal design work, it's probably fine — score it and draft normally.
