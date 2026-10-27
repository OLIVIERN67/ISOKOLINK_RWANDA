import { Link } from "react-router-dom";
import { ArrowRight, BadgeCheck, HeartHandshake, Leaf, ShieldCheck, Sprout, Target, Users } from "lucide-react";
import { useDocumentTitle } from "../components/ScrollToTop";
import { PageHeader } from "../components/ui/PageHeader";

export function AboutPage() {
  useDocumentTitle("About us");

  return (
    <div>
      <section className="border-b border-forest-100 bg-white">
        <div className="container-page py-10 sm:py-14">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <PageHeader
                eyebrow="About ISOKOLINK RWANDA"
                title="Making Rwanda's food market visible, fair, and connected."
                subtitle="We bring buyers and food sellers closer together with reviewed listings, transparent market prices, and direct communication."
              />
              <div className="flex flex-wrap gap-2">
                <Link to="/products" className="btn-primary">Explore the marketplace</Link>
                <Link to="/prices" className="btn-outline">See market prices</Link>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-3xl border border-forest-100">
              <img
                src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1000&q=80"
                alt="Fresh produce displayed at a market"
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <div className="container-page py-10">
        <div className="grid gap-6 lg:grid-cols-3">
          {[
            {
              icon: Target,
              title: "Our mission",
              body: "Give every Rwandan buyer reliable access to food information and every seller a fair chance to be discovered.",
            },
            {
              icon: Leaf,
              title: "Our focus",
              body: "Food products grown, processed, and sold in Rwanda, with clear units, locations, and seller identities.",
            },
            {
              icon: HeartHandshake,
              title: "Our approach",
              body: "Moderate listings before publishing, show price freshness honestly, and let both sides talk directly.",
            },
          ].map((item) => (
            <div key={item.title} className="card p-6">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-forest-50 text-forest-700">
                <item.icon className="h-5 w-5" aria-hidden />
              </span>
              <h2 className="mt-4 font-display text-lg font-bold">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-charcoal/65">{item.body}</p>
            </div>
          ))}
        </div>

        <section className="mt-12 grid gap-8 lg:grid-cols-2">
          <div>
            <h2 className="font-display text-2xl font-bold">Why ISOKOLINK exists</h2>
            <div className="prose-page mt-4">
              <p>
                Rwanda's food market is vibrant but fragmented. Buyers often rely on word of mouth to find products and
                guess whether a price is fair. Sellers, especially small producers, struggle to reach customers beyond
                their immediate market.
              </p>
              <p>
                ISOKOLINK creates a shared digital space where approved food listings are visible across districts,
                market price observations show how prices move over time, and buyers can reach sellers without exposing
                personal phone numbers.
              </p>
              <p>
                We are not a payment platform and we do not deliver products. We provide the information and connection
                layer that helps both sides make better decisions.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="font-display text-2xl font-bold">What you can count on</h2>
            {[
              { icon: ShieldCheck, title: "Reviewed listings", body: "Administrators approve, reject, or request corrections before listings are public." },
              { icon: BadgeCheck, title: "Clear seller identities", body: "Seller profiles show business names, location, and registration status." },
              { icon: Sprout, title: "Price freshness", body: "Every market observation displays how old it is, so outdated data is obvious." },
              { icon: Users, title: "Direct conversations", body: "Marketplace messaging keeps negotiations inside a recordable channel." },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3 rounded-xl border border-forest-100 bg-white p-4">
                <item.icon className="mt-0.5 h-5 w-5 shrink-0 text-forest-600" aria-hidden />
                <div>
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="mt-0.5 text-xs leading-5 text-charcoal/60">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12 rounded-3xl bg-forest-700 p-6 text-white sm:p-10">
          <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr] md:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-harvest">Join the network</p>
              <h2 className="mt-2 font-display text-2xl font-bold text-white sm:text-3xl">
                Whether you grow, sell, or buy food, there is a place for you.
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">
                Create a buyer account in seconds. Register as a seller when you are ready to publish listings for review.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row md:justify-end">
              <Link to="/register" className="btn-gold">Create an account</Link>
              <Link to="/dashboard/become-seller" className="btn-outline border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white">
                Become a seller <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
