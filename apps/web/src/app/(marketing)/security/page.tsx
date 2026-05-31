import type { Metadata } from 'next';
import Link from 'next/link';
import { Lock, Shield, Eye, AlertTriangle, Server, Key } from 'lucide-react';
import RevealOnScroll from '@/components/marketing/RevealOnScroll';

export const metadata: Metadata = {
  title: 'Security',
  description:
    'How Nexus protects your data — encryption, access controls, responsible disclosure, and more.',
};

const PRACTICES = [
  {
    icon: Lock,
    title: 'Encryption in transit',
    body: 'All data is encrypted using TLS 1.2+ in transit. We enforce HTTPS across all endpoints and reject insecure connections.',
  },
  {
    icon: Server,
    title: 'Encryption at rest',
    body: 'Your workspace data is encrypted at rest using AES-256. Backups are encrypted and stored in geographically separated locations.',
  },
  {
    icon: Eye,
    title: 'Access controls',
    body: 'Role-based access controls limit data access to authorised personnel. Production access is restricted and logged. We follow the principle of least privilege.',
  },
  {
    icon: Shield,
    title: 'Infrastructure security',
    body: 'Our infrastructure runs on SOC 2 Type II and ISO 27001 certified cloud providers. We inherit industry-leading security controls and layer our own access policies, network segmentation, and monitoring on top.',
  },
  {
    icon: Key,
    title: 'Authentication',
    body: 'Sessions use short-lived tokens with automatic rotation. Passwords are hashed with a strong, salted algorithm. We support SSO on enterprise plans.',
  },
  {
    icon: AlertTriangle,
    title: 'Dependency scanning',
    body: 'We regularly scan our dependencies for known vulnerabilities and apply patches promptly. Our CI pipeline rejects builds with high-severity CVEs.',
  },
];

export default function SecurityPage() {
  return (
    <div className="px-6">
      {/* Hero */}
      <section className="pt-20 pb-14 max-w-[1120px] mx-auto">
        <RevealOnScroll>
          <h1 className="font-display text-[clamp(34px,5vw,60px)] font-semibold tracking-[-0.04em] leading-[1.0] mb-6">
            Your data is your data.
          </h1>
          <p className="text-[19px] text-muted leading-relaxed max-w-[52ch]">
            We take data security seriously. Here's a straightforward account of what we do to keep your workspace safe — no marketing fluff, just the facts.
          </p>
        </RevealOnScroll>
      </section>

      <div className="max-w-[1120px] mx-auto border-t border-border" />

      {/* Practices grid */}
      <section className="py-16 max-w-[1120px] mx-auto">
        <RevealOnScroll className="mb-10">
          <h2 className="font-display text-[clamp(22px,2.8vw,32px)] font-semibold tracking-[-0.025em]">
            What we do
          </h2>
        </RevealOnScroll>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-[18px]">
          {PRACTICES.map(({ icon: Icon, title, body }, i) => (
            <RevealOnScroll key={title} delay={i * 50}>
              <div className="p-6 rounded-2xl border border-border bg-card h-full">
                <div className="w-11 h-11 rounded-xl border border-border bg-background flex items-center justify-center text-accent mb-4">
                  <Icon className="w-5 h-5" strokeWidth={1.9} />
                </div>
                <h3 className="text-[16px] font-semibold tracking-tight mb-2">{title}</h3>
                <p className="text-[13.5px] text-muted leading-relaxed">{body}</p>
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </section>

      <div className="max-w-[1120px] mx-auto border-t border-border" />

      {/* Responsible disclosure */}
      <section className="py-16 max-w-[1120px] mx-auto">
        <div className="grid lg:grid-cols-[1fr_1.1fr] gap-14 items-start">
          <RevealOnScroll>
            <h2 className="font-display text-[clamp(22px,2.8vw,32px)] font-semibold tracking-[-0.025em] mb-4">
              Responsible disclosure
            </h2>
            <p className="text-[16px] text-muted leading-relaxed mb-4">
              We welcome security researchers who help us keep Nexus safe. If you&apos;ve found a vulnerability, please tell us before disclosing it publicly so we can fix it first.
            </p>
            <p className="text-[16px] text-muted leading-relaxed">
              We commit to: acknowledge your report within 2 business days, keep you informed as we investigate and fix the issue, and not take legal action against researchers acting in good faith.
            </p>
          </RevealOnScroll>
          <RevealOnScroll delay={80}>
            <div className="p-7 rounded-2xl border border-border bg-card space-y-5">
              <div>
                <div className="text-[12px] tracking-[0.08em] uppercase text-muted font-semibold mb-2">Report to</div>
                <a href="mailto:security@usenexus.app" className="text-[17px] font-medium text-accent hover:opacity-80 transition-opacity">
                  security@usenexus.app
                </a>
              </div>
              <div className="border-t border-border pt-5">
                <div className="text-[12px] tracking-[0.08em] uppercase text-muted font-semibold mb-3">Scope</div>
                <ul className="space-y-2 text-[14px] text-muted">
                  {['Authentication and session management', 'Access control and privilege escalation', 'Data exposure or exfiltration', 'XSS, CSRF, and injection attacks', 'API security issues'].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent/60 mt-2 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="border-t border-border pt-5">
                <div className="text-[12px] tracking-[0.08em] uppercase text-muted font-semibold mb-3">Out of scope</div>
                <ul className="space-y-2 text-[14px] text-muted">
                  {['Social engineering of Nexus employees', 'DoS or DDoS attacks', 'Vulnerabilities in third-party software we use', 'Physical attacks'].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full border border-muted/40 mt-2 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      <div className="max-w-[1120px] mx-auto border-t border-border" />

      {/* Data commitments */}
      <section className="py-16 max-w-[1120px] mx-auto">
        <RevealOnScroll className="mb-8">
          <h2 className="font-display text-[clamp(22px,2.8vw,32px)] font-semibold tracking-[-0.025em]">
            Our commitments
          </h2>
        </RevealOnScroll>
        <RevealOnScroll>
          <div className="grid md:grid-cols-3 gap-[18px] text-[14.5px]">
            {[
              { label: 'Your data belongs to you', value: 'We never sell your data or use it to train models. You can export everything at any time. Deletion is permanent and complete.' },
              { label: 'Availability', value: 'Automated daily backups with 30-day retention. Point-in-time recovery available on paid plans. We target 99.9% uptime.' },
              { label: 'Transparency', value: 'We publish our uptime history, disclose security incidents promptly, and maintain a full sub-processor list available on request.' },
            ].map(({ label, value }) => (
              <div key={label} className="p-6 rounded-2xl border border-border bg-card">
                <div className="text-[12px] tracking-[0.08em] uppercase text-muted font-semibold mb-2">{label}</div>
                <p className="text-muted leading-relaxed">{value}</p>
              </div>
            ))}
          </div>
        </RevealOnScroll>
      </section>

      <div className="max-w-[1120px] mx-auto border-t border-border pb-16" />

      <section className="py-10 max-w-[1120px] mx-auto">
        <RevealOnScroll>
          <p className="text-[14.5px] text-muted">
            Questions about security?{' '}
            <a href="mailto:security@usenexus.app" className="text-accent hover:opacity-80 transition-opacity">
              security@usenexus.app
            </a>
            {' '}· See also our{' '}
            <Link href="/legal/privacy" className="text-accent hover:opacity-80 transition-opacity">Privacy Policy</Link>
            {' '}and{' '}
            <Link href="/status" className="text-accent hover:opacity-80 transition-opacity">Status page</Link>.
          </p>
        </RevealOnScroll>
      </section>
    </div>
  );
}
