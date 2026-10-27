import { PageHeader } from "../../components/ui/PageHeader";
import { ProductBrowser } from "../../components/ProductBrowser";

export function BrowseProductsPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Buyer workspace"
        title="Browse products"
        subtitle="Search fresh food from registered sellers across Rwanda."
      />
      <ProductBrowser />
    </div>
  );
}
