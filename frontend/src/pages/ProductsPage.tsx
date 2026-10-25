import { Link } from "react-router-dom";
import { ShoppingBasket } from "lucide-react";
import { useDocumentTitle } from "../components/ScrollToTop";
import { ProductBrowser } from "../components/ProductBrowser";
import { PageHeader } from "../components/ui/PageHeader";

export function ProductsPage() {
  useDocumentTitle("Browse food products");

  return (
    <div>
      <section className="border-b border-forest-100 bg-white">
        <div className="container-page py-8">
          <nav className="mb-4 flex items-center gap-1.5 text-xs text-charcoal/50" aria-label="Breadcrumb">
            <Link to="/" className="hover:text-forest-700">Home</Link>
            <span aria-hidden>/</span>
            <span className="text-charcoal">Products</span>
          </nav>
          <PageHeader
            eyebrow="Marketplace"
            title="Browse food products"
            subtitle="Approved listings from active sellers across Rwanda. Filter by category, district, or price to find what you need."
            actions={
              <Link to="/prices" className="btn-outline">
                <ShoppingBasket className="h-4 w-4" aria-hidden />
                Compare market prices
              </Link>
            }
          />
        </div>
      </section>
      <div className="container-page py-8">
        <ProductBrowser />
      </div>
    </div>
  );
}
