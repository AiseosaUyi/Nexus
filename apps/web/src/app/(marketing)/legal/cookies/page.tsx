import type { Metadata } from 'next';
import LegalLayout from '../LegalLayout';

export const metadata: Metadata = {
  title: 'Cookie Policy',
  description: 'How Nexus uses cookies and similar tracking technologies.',
};

const LAST_UPDATED = 'May 1, 2025';

const TOC = [
  'What are cookies',
  'How we use cookies',
  'Types of cookies we use',
  'Third-party cookies',
  'Managing cookies',
  'Changes to this policy',
  'Contact',
];

const COOKIE_TABLE: [string, string, string, string][] = [
  ['nexus-theme', 'Functional', 'Persistent', 'Remembers your light/dark preference'],
  ['supabase-auth-token', 'Essential', 'Session', 'Maintains your authenticated session'],
  ['_posthog', 'Analytics', 'Persistent', 'Product analytics (PostHog) — opt-out available'],
];

export default function CookiesPage() {
  return (
    <LegalLayout title="Cookie Policy" lastUpdated={LAST_UPDATED} toc={TOC}>
      <section id="what-are-cookies">
        <h2>1. What are cookies</h2>
        <p>
          Cookies are small text files that are stored on your device when you visit a website. They are widely used to make websites work, or work more efficiently, and to provide information to the owners of the site. Similar technologies include local storage, session storage, and pixel tags.
        </p>
      </section>

      <section id="how-we-use-cookies">
        <h2>2. How we use cookies</h2>
        <p>We use cookies and similar technologies to:</p>
        <ul>
          <li>Keep you signed in to your account</li>
          <li>Remember your preferences (such as light or dark mode)</li>
          <li>Understand how you use the Service and identify areas for improvement</li>
          <li>Protect the security of your account</li>
        </ul>
      </section>

      <section id="types-of-cookies-we-use">
        <h2>3. Types of cookies we use</h2>
        <p>
          <strong>Essential cookies</strong> are necessary for the Service to function. Without these cookies, the Service cannot be provided. You cannot opt out of these.
        </p>
        <p>
          <strong>Functional cookies</strong> remember choices you make (such as your preferred theme) and provide enhanced, personalised features. You can disable these but some features may not work correctly.
        </p>
        <p>
          <strong>Analytics cookies</strong> help us understand how visitors interact with the Service by collecting and reporting information anonymously. You can opt out of analytics cookies.
        </p>

        <div className="mt-5 overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-[13.5px] border-collapse">
            <thead>
              <tr className="border-b border-border bg-sidebar text-left">
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Duration</th>
                <th className="px-4 py-3 font-semibold">Purpose</th>
              </tr>
            </thead>
            <tbody>
              {COOKIE_TABLE.map(([name, type, duration, purpose]) => (
                <tr key={name} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-mono text-[12.5px]">{name}</td>
                  <td className="px-4 py-3 text-muted">{type}</td>
                  <td className="px-4 py-3 text-muted">{duration}</td>
                  <td className="px-4 py-3 text-muted">{purpose}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="third-party-cookies">
        <h2>4. Third-party cookies</h2>
        <p>
          Some cookies are placed by third-party services that appear on our pages. These third parties may collect information about your online activities across different websites. We use the following third-party services that may set cookies:
        </p>
        <ul>
          <li><strong>PostHog</strong> — product analytics. You can opt out at posthog.com/privacy.</li>
          <li><strong>Supabase</strong> — authentication infrastructure.</li>
        </ul>
      </section>

      <section id="managing-cookies">
        <h2>5. Managing cookies</h2>
        <p>
          You can control and manage cookies through your browser settings. Most browsers allow you to refuse cookies or to be alerted when cookies are being set. Note that disabling cookies may affect the functionality of the Service — in particular, you will not be able to stay signed in.
        </p>
        <p>
          For analytics cookies specifically, you can opt out within the Service settings or by following the opt-out instructions provided by the relevant third-party service.
        </p>
      </section>

      <section id="changes-to-this-policy">
        <h2>6. Changes to this policy</h2>
        <p>
          We may update this Cookie Policy from time to time to reflect changes in our practices or applicable law. We will update the &ldquo;last updated&rdquo; date when we do so.
        </p>
      </section>

      <section id="contact">
        <h2>7. Contact</h2>
        <p>
          If you have questions about our use of cookies, please contact us at{' '}
          <a href="mailto:privacy@usenexus.app">privacy@usenexus.app</a>.
        </p>
      </section>
    </LegalLayout>
  );
}
