import type { Metadata } from 'next';
import LegalLayout from '../LegalLayout';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'The terms that govern your use of Nexus.',
};

const LAST_UPDATED = 'May 1, 2025';

const TOC = [
  'Acceptance of terms',
  'Description of service',
  'User accounts',
  'Acceptable use',
  'Intellectual property',
  'Data and privacy',
  'Billing and payments',
  'Termination',
  'Disclaimers',
  'Limitation of liability',
  'Governing law',
  'Changes to terms',
  'Contact',
];

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Service" lastUpdated={LAST_UPDATED} toc={TOC}>
      <section id="acceptance-of-terms">
        <h2>1. Acceptance of terms</h2>
        <p>
          By accessing or using Nexus (&ldquo;the Service&rdquo;) operated by Nexus, Inc. (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.
        </p>
        <p>
          These terms apply to all users of the Service, including without limitation users who are contributors of content, information, and other materials or services.
        </p>
      </section>

      <section id="description-of-service">
        <h2>2. Description of service</h2>
        <p>
          Nexus is a collaborative knowledge workspace that allows individuals and teams to create, organize, and share documents, notes, and other content. The Service includes a web application, associated APIs, and related features and functionality.
        </p>
      </section>

      <section id="user-accounts">
        <h2>3. User accounts</h2>
        <p>
          To access certain features of the Service, you must register for an account. You agree to provide accurate, current, and complete information during registration and to update such information to keep it accurate, current, and complete.
        </p>
        <p>
          You are responsible for safeguarding your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account. We cannot and will not be liable for any loss or damage arising from your failure to comply with this section.
        </p>
        <p>
          You may not use another person&apos;s account without permission. You must be at least 16 years of age to use the Service.
        </p>
      </section>

      <section id="acceptable-use">
        <h2>4. Acceptable use</h2>
        <p>You agree not to use the Service to:</p>
        <ul>
          <li>Violate any applicable laws or regulations</li>
          <li>Upload or share content that infringes intellectual property rights</li>
          <li>Transmit harmful, offensive, or illegal content</li>
          <li>Interfere with or disrupt the integrity or performance of the Service</li>
          <li>Attempt to gain unauthorized access to any part of the Service</li>
          <li>Use automated means to access or scrape the Service without our prior written consent</li>
          <li>Impersonate any person or entity or misrepresent your affiliation with any person or entity</li>
        </ul>
      </section>

      <section id="intellectual-property">
        <h2>5. Intellectual property</h2>
        <p>
          The Service and its original content (excluding content provided by users), features, and functionality are and will remain the exclusive property of Nexus, Inc. and its licensors. The Service is protected by copyright, trademark, and other laws.
        </p>
        <p>
          You retain ownership of any content you submit to the Service. By submitting content, you grant us a worldwide, non-exclusive, royalty-free license to use, store, and display such content solely for the purpose of providing and improving the Service.
        </p>
      </section>

      <section id="data-and-privacy">
        <h2>6. Data and privacy</h2>
        <p>
          Our collection and use of personal information in connection with your access to and use of the Service is described in our <a href="/legal/privacy">Privacy Policy</a>, which is incorporated into these Terms by reference.
        </p>
      </section>

      <section id="billing-and-payments">
        <h2>7. Billing and payments</h2>
        <p>
          Some features of the Service are offered on a subscription basis. By selecting a paid plan, you agree to pay the fees associated with that plan. Fees are charged in advance on a monthly or annual basis and are non-refundable except as required by law.
        </p>
        <p>
          We reserve the right to change our pricing at any time. If we change pricing for a plan you are subscribed to, we will provide at least 30 days&apos; notice before the change takes effect.
        </p>
      </section>

      <section id="termination">
        <h2>8. Termination</h2>
        <p>
          We may terminate or suspend your account and access to the Service at our sole discretion, without notice, for conduct that we believe violates these Terms or is harmful to other users, us, third parties, or for any other reason.
        </p>
        <p>
          You may terminate your account at any time by contacting us or using the account deletion function within the Service. Upon termination, your right to use the Service will immediately cease.
        </p>
      </section>

      <section id="disclaimers">
        <h2>9. Disclaimers</h2>
        <p>
          THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
        </p>
        <p>
          We do not warrant that the Service will be uninterrupted, error-free, or secure, or that defects will be corrected.
        </p>
      </section>

      <section id="limitation-of-liability">
        <h2>10. Limitation of liability</h2>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, NEXUS, INC. SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM YOUR ACCESS TO OR USE OF (OR INABILITY TO ACCESS OR USE) THE SERVICE.
        </p>
      </section>

      <section id="governing-law">
        <h2>11. Governing law</h2>
        <p>
          These Terms shall be governed by and construed in accordance with the laws of the State of Delaware, United States, without regard to its conflict of law provisions.
        </p>
      </section>

      <section id="changes-to-terms">
        <h2>12. Changes to terms</h2>
        <p>
          We reserve the right to modify these Terms at any time. We will provide notice of material changes by updating the &ldquo;last updated&rdquo; date at the top of this page and, where appropriate, by sending an email to the address associated with your account. Your continued use of the Service after such changes constitutes your acceptance of the new Terms.
        </p>
      </section>

      <section id="contact">
        <h2>13. Contact</h2>
        <p>
          If you have questions about these Terms, please contact us at{' '}
          <a href="mailto:legal@usenexus.app">legal@usenexus.app</a>.
        </p>
      </section>
    </LegalLayout>
  );
}
