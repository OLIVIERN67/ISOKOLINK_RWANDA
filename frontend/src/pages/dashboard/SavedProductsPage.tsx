import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bookmark, ShoppingBasket } from "lucide-react";
import { getApiError, userApi } from "../../services/api";
import type { PaginationMeta, Product } from "../../types";
import { useToast } from "../../context/ToastContext";
import { PageHeader } from "../../components/ui/PageHeader";
import { ProductCard, ProductGridSkeleton } from "../../components/ProductCard";
import { EmptyState, ErrorState } from "../../components/ui/States";
import { Pagination } from "../../components/ui/Pagination";

export function SavedProductsPage() {
  const { success, error } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(null);
    userApi
      .savedProducts(page, 12)
      .then((result) => {
        if (!active) return;
        setProducts(result.items);
        setMeta(result.meta as unknown as PaginationMeta);
      })
      .catch((requestError) => {
        if (active) setLoadError(getApiError(requestError).message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [page]);

  async function handleUnsaved(product: Product) {
    try {
      await userApi.unsave(product.id);
      setProducts((current) => current.filter((item) => item.id !== product.id));
      setMeta((current) => (current ? { ...current, total: Math.max(0, current.total - 1) } : current));
      success(`${product.name} removed from saved products.`);
    } catch (requestError) {
      error(getApiError(requestError).message);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Buyer workspace"
        title="Saved products"
        subtitle="Your shortlist of listings to revisit and compare."
        actions={
          <Link to="/dashboard/browse" className="btn-outline">
            <ShoppingBasket className="h-4 w-4" aria-hidden />
            Find more products
          </Link>
        }
      />
      {loading ? (
        <ProductGridSkeleton count={8} />
      ) : loadError ? (
        <ErrorState message={loadError} />
      ) : products.length === 0 ? (
        <EmptyState
          title="No saved products yet"
          description="Tap the bookmark on a listing to keep it here for later."
          icon={<Bookmark className="h-6 w-6" aria-hidden />}
          action={
            <Link to="/dashboard/browse" className="btn-primary">
              Browse products
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={{ ...product, isSaved: true }}
                onSaveChange={(saved) => {
                  if (!saved) void handleUnsaved(product);
                }}
              />
            ))}
          </div>
          {meta ? (
            <Pagination
              className="mt-8"
              page={meta.page}
              totalPages={meta.totalPages}
              total={meta.total}
              onChange={setPage}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
