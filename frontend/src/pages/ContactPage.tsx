import { useState } from "react";
import { Link } from "react-router-dom";
import { Clock3, Mail, MapPin, MessageSquare, Phone, Send } from "lucide-react";
import { useDocumentTitle } from "../components/ScrollToTop";
import { PageHeader } from "../components/ui/PageHeader";
import { Button } from "../components/ui/Button";
import { Field } from "../components/ui/Field";

export function ContactPage() {
  useDocumentTitle("Contact us");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const subject = encodeURIComponent(`ISOKOLINK enquiry from ${name || "a visitor"}`);
    const body = encodeURIComponent(`${message}\n\nFrom: ${name}\nEmail: ${email}`);
    window.location.href = `mailto:hello@isokolink.rw?subject=${subject}&body=${body}`;
  }

  return (
    <div>
      <section className="border-b border-forest-100 bg-white">
        <div className="container-page py-10">
          <PageHeader
            eyebrow="Contact"
            title="Talk to the ISOKOLINK team"
            subtitle="Questions about your account, a listing, or the marketplace? Send us a message and we will get back to you."
          />
        </div>
      </section>

      <div className="container-page grid gap-8 py-10 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="space-y-3">
          {[
            {
              icon: Mail,
              title: "Email",
              body: "hello@isokolink.rw",
              href: "mailto:hello@isokolink.rw",
            },
            {
              icon: Phone,
              title: "Phone",
              body: "+250 788 000 000",
              href: "tel:+250788000000",
            },
            {
              icon: MapPin,
              title: "Office",
              body: "Kigali, Rwanda",
            },
            {
              icon: Clock3,
              title: "Support hours",
              body: "Monday to Friday, 08:00 – 17:00 CAT",
            },
          ].map((item) => (
            <div key={item.title} className="card flex items-start gap-3 p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-forest-50 text-forest-700">
                <item.icon className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-charcoal/45">{item.title}</p>
                {item.href ? (
                  <a href={item.href} className="mt-0.5 block text-sm font-semibold text-charcoal hover:text-forest-700">
                    {item.body}
                  </a>
                ) : (
                  <p className="mt-0.5 text-sm font-semibold text-charcoal">{item.body}</p>
                )}
              </div>
            </div>
          ))}
          <div className="rounded-xl bg-forest-50 p-4 text-xs leading-5 text-forest-900">
            <p className="flex items-center gap-1.5 font-semibold">
              <MessageSquare className="h-4 w-4" aria-hidden />
              Reporting a listing?
            </p>
            <p className="mt-1 text-forest-800/80">
              Use the “Report listing” button on the product page so the report reaches the moderation queue with the
              correct reference. For safety concerns, contact us directly.
            </p>
          </div>
        </div>

        <div className="card p-5 sm:p-6">
          <h2 className="font-display text-lg font-bold">Send a message</h2>
          <p className="mt-1 text-sm text-charcoal/55">
            This form opens your email app with the message ready to send. You can also email us directly.
          </p>
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Your name" htmlFor="contact-name" required>
                <input
                  id="contact-name"
                  className="input"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
              </Field>
              <Field label="Email address" htmlFor="contact-email" required>
                <input
                  id="contact-email"
                  type="email"
                  className="input"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </Field>
            </div>
            <Field label="Message" htmlFor="contact-body" required>
              <textarea
                id="contact-body"
                className="textarea"
                rows={6}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                minLength={10}
                required
              />
            </Field>
            <Button type="submit">
              <Send className="h-4 w-4" aria-hidden />
              Open email draft
            </Button>
            <p className="text-xs text-charcoal/45">
              For account security, never send your password or session details in an email.
            </p>
          </form>
        </div>
      </div>

      <div className="container-page pb-10">
        <div className="rounded-2xl border border-forest-100 bg-white p-5 text-sm text-charcoal/60">
          Looking for quick answers? Visit the{" "}
          <Link to="/faq" className="font-semibold text-forest-700 hover:underline">frequently asked questions</Link>{" "}
          or review our{" "}
          <Link to="/privacy" className="font-semibold text-forest-700 hover:underline">privacy policy</Link>.
        </div>
      </div>
    </div>
  );
}
