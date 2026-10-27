import { useState } from "react";
import { Link } from "react-router-dom";
import { Clock3, Mail, MapPin, MessageSquare, Phone, Send } from "lucide-react";
import { useDocumentTitle } from "../components/ScrollToTop";
import { PageHeader } from "../components/ui/PageHeader";
import { Button } from "../components/ui/Button";
import { Field } from "../components/ui/Field";
import { useI18n } from "../context/I18nContext";

export function ContactPage() {
  const { t } = useI18n();
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
            eyebrow={t("contact.eyebrow")}
            title={t("contact.title")}
            subtitle={t("contact.subtitle")}
          />
        </div>
      </section>

      <div className="container-page grid gap-8 py-10 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="space-y-3">
          {[
            {
              icon: Mail,
              title: t("contact.email"),
              body: "hello@isokolink.rw",
              href: "mailto:hello@isokolink.rw",
            },
            {
              icon: Phone,
              title: t("contact.phone"),
              body: "+250 788 000 000",
              href: "tel:+250788000000",
            },
            {
              icon: MapPin,
              title: t("contact.office"),
              body: "Kigali, Rwanda",
            },
            {
              icon: Clock3,
              title: t("contact.hours"),
              body: t("contact.hoursValue"),
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
              {t("contact.reportingTitle")}
            </p>
            <p className="mt-1 text-forest-800/80">
              {t("contact.reportingBody")}
            </p>
          </div>
        </div>

        <div className="card p-5 sm:p-6">
          <h2 className="font-display text-lg font-bold">{t("contact.sendMessage")}</h2>
          <p className="mt-1 text-sm text-charcoal/55">
            {t("contact.formDescription")}
          </p>
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("contact.name")} htmlFor="contact-name" required>
                <input
                  id="contact-name"
                  className="input"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
              </Field>
              <Field label={t("contact.emailAddress")} htmlFor="contact-email" required>
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
            <Field label={t("contact.message")} htmlFor="contact-body" required>
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
              {t("contact.openEmail")}
            </Button>
            <p className="text-xs text-charcoal/45">
              {t("contact.securityNotice")}
            </p>
          </form>
        </div>
      </div>

      <div className="container-page pb-10">
        <div className="rounded-2xl border border-forest-100 bg-white p-5 text-sm text-charcoal/60">
          {t("contact.quickAnswers")}{" "}
          <Link to="/faq" className="font-semibold text-forest-700 hover:underline">{t("contact.faq")}</Link>{" "}
          {t("contact.orReview")}{" "}
          <Link to="/privacy" className="font-semibold text-forest-700 hover:underline">{t("contact.privacy")}</Link>.
        </div>
      </div>
    </div>
  );
}
