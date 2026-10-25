import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { useDocumentTitle } from "../components/ScrollToTop";
import { PageHeader } from "../components/ui/PageHeader";

const faqs = [
  {
    q: "What is ISOKOLINK RWANDA?",
    a: "ISOKOLINK RWANDA is a food marketplace that connects buyers with food sellers across Rwanda. It includes approved product listings, market price observations, seller profiles, and direct messaging. We are not a payment or delivery platform.",
  },
  {
    q: "How do I buy a product?",
    a: "Browse or search for a product, open its detail page, and message the seller to confirm availability, quantity, pickup or delivery, and payment arrangements. Transactions are completed directly between you and the seller.",
  },
  {
    q: "Is every product verified?",
    a: "Listings must be approved by an administrator before they become public, and sellers must have an active, complete seller profile. Approval does not guarantee quality or delivery, so inspect goods before paying.",
  },
  {
    q: "How do I become a seller?",
    a: "Sign in with a verified email address, open the dashboard, and choose “Become a seller.” Complete your business details and district, then submit listings for review. Your first listing is reviewed before it is published.",
  },
  {
    q: "Why is my listing pending?",
    a: "New listings and substantial edits to approved listings are reviewed by administrators. You will see the status in your seller dashboard and receive a notification when a decision is made.",
  },
  {
    q: "How are market prices collected?",
    a: "Administrators record prices observed in markets, including the product, unit, market, district, observation date, and verification status. The prices page shows freshness and labels old or unverified observations.",
  },
  {
    q: "Can I compare different units such as kg and sacks?",
    a: "Yes. Units have a conversion factor to a base unit, and the price comparison shows a normalized rate when that information is available. Always confirm the exact unit with the seller before agreeing.",
  },
  {
    q: "What should I do if I suspect a scam?",
    a: "Do not send advance payments. Use the “Report listing” button on the product page and provide as much detail as possible. For urgent safety concerns, contact local authorities first, then notify our support team.",
  },
  {
    q: "How do I reset my password?",
    a: "Choose “Forgot your password?” on the sign-in page and enter your email address. A reset link will be sent if an active account exists. Reset links expire for security.",
  },
  {
    q: "How do I delete or deactivate my account?",
    a: "Go to Dashboard → Security/Profile to deactivate your account. If you need your data deleted, contact support. Some records may be retained where required for audit, fraud prevention, or legal obligations.",
  },
];

export function FaqPage() {
  useDocumentTitle("Frequently asked questions");

  return (
    <div>
      <section className="border-b border-forest-100 bg-white">
        <div className="container-page py-10">
          <PageHeader
            eyebrow="Help centre"
            title="Frequently asked questions"
            subtitle="Quick answers about buying, selling, verification, prices, and account security."
          />
        </div>
      </section>
      <div className="container-page max-w-4xl py-10">
        <div className="space-y-3">
          {faqs.map((faq) => (
            <details key={faq.q} className="group card overflow-hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 font-semibold text-charcoal">
                {faq.q}
                <ChevronDown className="h-4 w-4 shrink-0 text-forest-600 transition group-open:rotate-180" aria-hidden />
              </summary>
              <div className="border-t border-gray-100 px-5 pb-5 pt-4 text-sm leading-6 text-charcoal/65">{faq.a}</div>
            </details>
          ))}
        </div>
        <div className="mt-8 rounded-2xl bg-forest-50 p-5 text-sm text-forest-900">
          Still need help?{" "}
          <Link to="/contact" className="font-semibold underline underline-offset-2">Contact the ISOKOLINK team</Link>.
        </div>
      </div>
    </div>
  );
}
