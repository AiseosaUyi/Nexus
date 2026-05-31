import type { Metadata } from 'next';
import LegalLayout from '../LegalLayout';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Nexus collects, uses, and protects your personal information.',
};

const LAST_UPDATED = 'May 1, 2025';

const TOC = [
  'Information we collect',
  'How we use information',
  'Information sharing',
  'Data retention',
  'Security',
  'Cookies and tracking',
  'Third-party services',
  'Your rights',
  'Children\'s privacy',
  'Changes to this policy',
  'Contact',
];

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" lastUpdated={LAST_UPDATED} toc={TOC}>
      <section id="information-we-collect">
        <h2>1. Information we collect</h2>
        <p>
          We collect information you provide directly to us, such as when you create an account, use our Service, or contact us for support. This may include:
        </p>
        <ul>
          <li>Name and email address</li>
          <li>Account credentials</li>
          <li>Content you create within the Service (documents, notes, comments)</li>
          <li>Team and workspace information</li>
          <li>Payment information (processed by our payment provider — we do not store raw card data)</li>
        </ul>
        <p>
          We also collect information automatically when you use the Service, including usage data (pages visited, features used, actions taken), device information (browser type, operating system), and log data (IP address, access times).
        </p>
      </section>

      <section id="how-we-use-information">
        <h2>2. How we use information</h2>
        <p>We use the information we collect to:</p>
        <ul>
          <li>Provide, maintain, and improve the Service</li>
          <li>Process transactions and send related information</li>
          <li>Send technical notices, updates, and support messages</li>
          <li>Respond to your comments and questions</li>
          <li>Monitor and analyze usage patterns to improve user experience</li>
          <li>Detect, investigate, and prevent fraudulent or unauthorized activity</li>
          <li>Comply with legal obligations</li>
        </ul>
      </section>

      <section id="information-sharing">
        <h2>3. Information sharing</h2>
        <p>
          We do not sell, trade, or rent your personal information to third parties. We may share your information in the following circumstances:
        </p>
        <ul>
          <li><strong>Service providers:</strong> With vendors who perform services on our behalf (hosting, analytics, customer support), under appropriate confidentiality agreements.</li>
          <li><strong>Business transfers:</strong> In connection with a merger, acquisition, or sale of assets, with appropriate notice to you.</li>
          <li><strong>Legal requirements:</strong> When required by law, court order, or governmental authority.</li>
          <li><strong>Safety:</strong> When we believe disclosure is necessary to prevent harm or protect rights.</li>
          <li><strong>With your consent:</strong> In any other case, with your explicit consent.</li>
        </ul>
        <p>
          Within your workspace, content is accessible to other members of that workspace according to the roles and permissions you configure.
        </p>
      </section>

      <section id="data-retention">
        <h2>4. Data retention</h2>
        <p>
          We retain your information for as long as your account is active or as needed to provide the Service. You may request deletion of your account and associated data at any time. After deletion, we may retain certain information as required by law or for legitimate business purposes for up to 90 days.
        </p>
      </section>

      <section id="security">
        <h2>5. Security</h2>
        <p>
          We implement industry-standard security measures to protect your information, including encryption in transit (TLS) and at rest, access controls, and regular security reviews. No method of electronic storage or transmission is 100% secure, and we cannot guarantee absolute security.
        </p>
        <p>
          If you discover a security vulnerability, please disclose it responsibly to{' '}
          <a href="mailto:security@usenexus.app">security@usenexus.app</a>. See our <a href="/security">Security page</a> for more details.
        </p>
      </section>

      <section id="cookies-and-tracking">
        <h2>6. Cookies and tracking</h2>
        <p>
          We use cookies and similar tracking technologies to provide and improve the Service. For detailed information on what we use and how to control it, see our <a href="/legal/cookies">Cookie Policy</a>.
        </p>
      </section>

      <section id="third-party-services">
        <h2>7. Third-party services</h2>
        <p>
          The Service may contain links to third-party websites or integrate with third-party services. This Privacy Policy does not apply to those services, and we are not responsible for their privacy practices. We encourage you to review the privacy policies of any third-party services you use.
        </p>
      </section>

      <section id="your-rights">
        <h2>8. Your rights</h2>
        <p>
          Depending on your location, you may have certain rights regarding your personal information, including the right to access, correct, delete, or port your data, and to object to or restrict certain processing. To exercise these rights, contact us at <a href="mailto:privacy@usenexus.app">privacy@usenexus.app</a>.
        </p>
        <p>
          If you are located in the European Economic Area, you have additional rights under the GDPR. We will respond to all requests within 30 days.
        </p>
      </section>

      <section id="childrens-privacy">
        <h2>9. Children&apos;s privacy</h2>
        <p>
          The Service is not directed to children under 16 years of age. We do not knowingly collect personal information from children under 16. If you believe we have collected information from a child under 16, please contact us immediately.
        </p>
      </section>

      <section id="changes-to-this-policy">
        <h2>10. Changes to this policy</h2>
        <p>
          We may update this Privacy Policy from time to time. We will notify you of material changes by updating the &ldquo;last updated&rdquo; date and, where appropriate, by email. Your continued use of the Service after such changes constitutes your acceptance of the new policy.
        </p>
      </section>

      <section id="contact">
        <h2>11. Contact</h2>
        <p>
          If you have questions about this Privacy Policy, please contact us at{' '}
          <a href="mailto:privacy@usenexus.app">privacy@usenexus.app</a> or write to:
        </p>
        <p>
          Nexus, Inc.<br />
          Privacy Team<br />
          [Address to be added]
        </p>
      </section>
    </LegalLayout>
  );
}
