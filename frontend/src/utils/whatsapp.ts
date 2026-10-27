import type { Product } from "../types";
import { formatCurrency } from "./format";
import type { Language } from "../i18n";

/** Convert a seller's public phone number into WhatsApp's digits-only format. */
export function toWhatsAppNumber(value: string | null | undefined): string | null {
  if (!value) return null;

  const trimmed = value.trim();
  if (!/^(?:\+|00)?[\d\s().-]+$/.test(trimmed)) return null;
  const explicitInternational = trimmed.startsWith("+") || trimmed.startsWith("00");
  let digits = trimmed.replace(/\D/g, "");

  if (trimmed.startsWith("00")) {
    digits = digits.slice(2);
  } else if (!explicitInternational && !digits.startsWith("250")) {
    // Seller phone numbers are Rwanda-based. Accept national formats such as
    // 0788 000 000 and 788 000 000, then normalize them to +250.
    if (digits.startsWith("0")) digits = `250${digits.slice(1)}`;
    else if (digits.length === 9) digits = `250${digits}`;
    else return null;
  }

  // E.164 allows up to 15 digits and does not allow a leading zero.
  return /^[1-9]\d{7,14}$/.test(digits) ? digits : null;
}

export function productWhatsAppUrl(product: Product, productUrl: string, language: Language = "en"): string | null {
  if (!product.seller.publicContactVisible) return null;
  const phone = toWhatsAppNumber(product.seller.phone);
  if (!phone) return null;

  const copy = {
    en: {
      intro: `Hello, I am interested in purchasing ${product.name}. I saw this product on your website. Could you please provide more information about its availability and price?`,
      product: "Product",
      price: "Price",
      productId: "Product ID",
      link: "Link",
    },
    fr: {
      intro: `Bonjour, je souhaite acheter ${product.name}. J’ai vu ce produit sur votre site. Pourriez-vous me renseigner sur sa disponibilité et son prix ?`,
      product: "Produit",
      price: "Prix",
      productId: "Référence du produit",
      link: "Lien",
    },
    rw: {
      intro: `Muraho, nifuza kugura ${product.name}. Nabonye iki gicuruzwa ku rubuga rwanyu. Mwampa andi makuru ku kuba kikiboneka n’igiciro cyacyo?`,
      product: "Igicuruzwa",
      price: "Igiciro",
      productId: "Nomero y’igicuruzwa",
      link: "Ihuza",
    },
  }[language];

  const message = [
    copy.intro,
    "",
    `${copy.product}: ${product.name}`,
    `${copy.price}: ${formatCurrency(product.price, product.currency)} per ${product.unit.label}`,
    `${copy.productId}: ${product.id}`,
    `${copy.link}: ${productUrl}`,
  ].join("\n");

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
