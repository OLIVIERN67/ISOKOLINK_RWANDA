import { Link, Outlet } from "react-router-dom";
import { BadgeCheck, ChartNoAxesCombined, MessagesSquare, ShieldCheck } from "lucide-react";
import { Logo } from "../../components/Logo";

export function AuthLayout() {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-forest-700 p-10 text-white lg:flex">
        <div className="absolute inset-0 opacity-15">
          <img
            src="https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=1400&q=80"
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
        <div className="absolute -left-20 bottom-0 h-72 w-72 rounded-full bg-harvest/20 blur-3xl" aria-hidden />
        <div className="relative">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white">
              <svg viewBox="0 0 32 32" className="h-6 w-6" fill="none" aria-hidden>
                <path d="M16 27c0-7 3-11 9-13-1 8-4 12-9 13Z" fill="currentColor" opacity="0.95" />
                <path d="M16 27C16 17 11 10 4 7c0 10 5 17 12 20Z" fill="currentColor" opacity="0.75" />
                <path d="M16 27V14" stroke="#E8B44F" strokeWidth="2" strokeLinecap="round" />
                <circle cx="16" cy="9" r="3" fill="#E8B44F" />
              </svg>
            </span>
            <span>
              <span className="block font-display text-lg font-extrabold tracking-tight">ISOKOLINK</span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.22em] text-harvest">Rwanda</span>
            </span>
          </Link>
        </div>

        <div className="relative max-w-md">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-harvest">Food marketplace</p>
          <h1 className="mt-3 font-display text-4xl font-extrabold leading-tight">
            Stronger links between Rwandan farms, markets, and families.
          </h1>
          <p className="mt-4 text-sm leading-7 text-white/70">
            Join a marketplace built on reviewed listings, transparent prices, and direct conversations.
          </p>
          <div className="mt-8 space-y-3">
            {[
              { icon: ShieldCheck, title: "Admin-reviewed listings", text: "Every product is checked before going live." },
              { icon: ChartNoAxesCombined, title: "Transparent prices", text: "Follow market observations and price freshness." },
              { icon: MessagesSquare, title: "Direct messaging", text: "Ask sellers questions without sharing your phone number." },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3 rounded-xl bg-white/5 p-3">
                <item.icon className="mt-0.5 h-5 w-5 shrink-0 text-harvest" aria-hidden />
                <div>
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="mt-0.5 text-xs text-white/60">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-white/40">© {new Date().getFullYear()} ISOKOLINK RWANDA</p>
      </aside>

      <main className="flex min-h-screen flex-col bg-cream">
        <div className="flex items-center justify-between p-5 lg:hidden">
          <Logo />
          <Link to="/" className="text-xs font-semibold text-forest-700">Back home</Link>
        </div>
        <div className="flex flex-1 items-center justify-center px-4 py-8 sm:px-8">
          <div className="w-full max-w-md">
            <Outlet />
            <p className="mt-6 text-center text-xs text-charcoal/40">
              <BadgeCheck className="mr-1 inline h-3.5 w-3.5" aria-hidden />
              Secure sessions · Protected account data
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
