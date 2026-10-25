import { useDocumentTitle } from "../components/ScrollToTop";
import { PageHeader } from "../components/ui/PageHeader";

export function PrivacyPage() {
  useDocumentTitle("Privacy policy");

  return (
    <div>
      <section className="border-b border-forest-100 bg-white">
        <div className="container-page py-10">
          <PageHeader
            eyebrow="Legal"
            title="Privacy policy"
            subtitle="How ISOKOLINK RWANDA collects, uses, and protects personal information."
          />
          <p className="text-xs text-charcoal/45">Last updated: {new Date().toLocaleDateString("en-RW", { year: "numeric", month: "long" })}</p>
        </div>
      </section>
      <article className="container-page prose-page max-w-3xl py-10">
        <p>
          This policy explains what information we collect when you use ISOKOLINK RWANDA, why we collect it, and the
          choices available to you. By using the service, you agree to this policy.
        </p>

        <h2>1. Information we collect</h2>
        <ul>
          <li><strong>Account information:</strong> full name, email address, phone number, preferred language, and password hash.</li>
          <li><strong>Seller profile information:</strong> business name, description, district, market, contact preferences, and optional profile image.</li>
          <li><strong>Listing information:</strong> product descriptions, prices, units, quantities, images, and availability.</li>
          <li><strong>Activity information:</strong> saved products, conversations and messages, notifications, reports, and audit events.</li>
          <li><strong>Technical information:</strong> session identifiers, IP address, and basic request logs used for security and troubleshooting.</li>
        </ul>

        <h2>2. How we use information</h2>
        <ul>
          <li>Create and secure your account, authenticate sessions, and verify your email address.</li>
          <li>Display seller profiles and approved product listings to buyers.</li>
          <li>Enable marketplace messaging and notifications about listings, reports, and account activity.</li>
          <li>Moderate content, investigate reports, prevent abuse, and maintain audit records.</li>
          <li>Publish aggregated or individual market price observations with freshness information.</li>
          <li>Respond to support requests and improve the reliability of the service.</li>
        </ul>

        <h2>3. Legal bases and consent</h2>
        <p>
          We process account and transactional data to provide the service you request, protect the platform, and meet
          legal obligations. Where consent is required, we ask for it clearly and you may withdraw it by contacting us.
        </p>

        <h2>4. Sharing information</h2>
        <p>
          Public pages show seller business details, approved listings, and any contact information a seller chooses to
          make public. Messages are visible to conversation participants and may be reviewed by administrators when a
          report or safety issue requires it. We do not sell personal information.
        </p>

        <h2>5. Cookies and sessions</h2>
        <p>
          We use a secure, HTTP-only session cookie to keep you signed in. We do not use advertising cookies. You can
          clear cookies in your browser, which will sign you out.
        </p>

        <h2>6. Retention and security</h2>
        <p>
          We retain account, listing, message, and audit data for as long as needed to operate the service and meet legal
          obligations. Passwords are stored as bcrypt hashes; session and verification tokens are stored as hashes.
          Uploaded images are served from controlled storage. No system is completely secure, so protect your password
          and report suspicious activity promptly.
        </p>

        <h2>7. Your choices and rights</h2>
        <ul>
          <li>Update your profile, language, and notification preferences in your dashboard.</li>
          <li>Deactivate your account from the profile and security pages.</li>
          <li>Request access, correction, or deletion of personal information by contacting us.</li>
          <li>Report content or users that violate our terms.</li>
        </ul>

        <h2>8. Children</h2>
        <p>The service is intended for users aged 18 and above. We do not knowingly collect data from children.</p>

        <h2>9. Changes and contact</h2>
        <p>
          We may update this policy and will revise the date above. Questions can be sent to{" "}
          <a href="mailto:privacy@isokolink.rw" className="font-semibold text-forest-700 hover:underline">privacy@isokolink.rw</a>.
        </p>
      </article>
    </div>
  );
}
