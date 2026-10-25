import { useDocumentTitle } from "../components/ScrollToTop";
import { PageHeader } from "../components/ui/PageHeader";

export function TermsPage() {
  useDocumentTitle("Terms of service");

  return (
    <div>
      <section className="border-b border-forest-100 bg-white">
        <div className="container-page py-10">
          <PageHeader
            eyebrow="Legal"
            title="Terms of service"
            subtitle="The rules for using the ISOKOLINK RWANDA marketplace."
          />
          <p className="text-xs text-charcoal/45">Last updated: {new Date().toLocaleDateString("en-RW", { year: "numeric", month: "long" })}</p>
        </div>
      </section>
      <article className="container-page prose-page max-w-3xl py-10">
        <p>
          These terms govern access to and use of ISOKOLINK RWANDA. By creating an account or using the marketplace, you
          agree to these terms. If you do not agree, do not use the service.
        </p>

        <h2>1. Marketplace role</h2>
        <p>
          ISOKOLINK provides a platform for sellers to publish food listings and for buyers to discover products, market
          prices, and seller profiles. We are not a party to any sale, do not process payments, do not hold goods, and do
          not provide delivery, inspection, or quality certification services.
        </p>

        <h2>2. Accounts</h2>
        <ul>
          <li>Provide accurate information and keep it up to date.</li>
          <li>You are responsible for safeguarding your password and all activity under your account.</li>
          <li>One person or business should not maintain duplicate accounts to evade moderation or suspension.</li>
          <li>You must be at least 18 years old to use the service.</li>
        </ul>

        <h2>3. Seller obligations</h2>
        <ul>
          <li>Publish only food products you are legally able to sell.</li>
          <li>Use accurate names, descriptions, units, quantities, prices, locations, and availability.</li>
          <li>Do not misrepresent origin, quality, weight, or certification.</li>
          <li>Respond honestly to buyer enquiries and comply with applicable Rwandan law.</li>
          <li>Listings and substantial edits may require administrator approval before publication.</li>
        </ul>

        <h2>4. Buyer responsibilities</h2>
        <ul>
          <li>Verify product details, quantity, unit, and condition directly with the seller.</li>
          <li>Inspect goods before paying and meet in safe, public locations where possible.</li>
          <li>Do not send advance mobile money payments to unknown parties.</li>
          <li>Use reports responsibly and provide accurate information.</li>
        </ul>

        <h2>5. Prohibited conduct</h2>
        <ul>
          <li>Fraud, scams, impersonation, or misleading listings.</li>
          <li>Illegal, unsafe, counterfeit, or stolen goods.</li>
          <li>Harassment, threats, hate speech, or discriminatory conduct.</li>
          <li>Spam, scraping, automated abuse, or attempts to bypass security and rate limits.</li>
          <li>Uploading malicious files or content that violates another person's rights.</li>
        </ul>

        <h2>6. Content and moderation</h2>
        <p>
          You retain ownership of the content you submit but grant ISOKOLINK a licence to display, store, and moderate it
          as needed to operate the marketplace. We may approve, reject, request corrections, suspend, or remove content,
          and may suspend or deactivate accounts that violate these terms. Moderation decisions prioritize buyer safety
          and marketplace integrity.
        </p>

        <h2>7. Market price information</h2>
        <p>
          Price observations are indicative. They may be delayed, incomplete, or unverified. Freshness labels are
          provided to help interpret recency. Always confirm the current price and unit with the seller. Price data is
          not a guarantee, appraisal, or financial advice.
        </p>

        <h2>8. Disputes between users</h2>
        <p>
          Buyers and sellers are responsible for resolving disputes directly. ISOKOLINK may review reports and take
          moderation action, but is not obligated to mediate, compensate, or enforce any transaction.
        </p>

        <h2>9. Limitation of liability</h2>
        <p>
          To the extent permitted by law, ISOKOLINK is not liable for indirect, incidental, or consequential losses,
          including losses arising from transactions, product quality, delivery, or reliance on price information. The
          service is provided on an “as is” and “as available” basis.
        </p>

        <h2>10. Termination and changes</h2>
        <p>
          You may stop using the service at any time and may deactivate your account. We may suspend or terminate access
          for violations, security risks, or legal requirements. We may update these terms and will revise the date above;
          continued use after changes constitutes acceptance.
        </p>

        <h2>11. Contact</h2>
        <p>
          Questions about these terms can be sent to{" "}
          <a href="mailto:legal@isokolink.rw" className="font-semibold text-forest-700 hover:underline">legal@isokolink.rw</a>.
        </p>
      </article>
    </div>
  );
}
