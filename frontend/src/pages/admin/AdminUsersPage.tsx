import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Eye, Search, Users } from "lucide-react";
import { adminApi, getApiError } from "../../services/api";
import type { AdminUserSummary, PaginationMeta } from "../../types";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { PageHeader } from "../../components/ui/PageHeader";
import { Badge } from "../../components/ui/Badge";
import { EmptyState, ErrorState, LoadingBlock } from "../../components/ui/States";
import { Pagination } from "../../components/ui/Pagination";
import { formatDate } from "../../utils/format";

export function AdminUsersPage() {
  const [params, setParams] = useSearchParams();
  const status = params.get("status") ?? "all";
  const role = params.get("role") ?? "all";
  const [search, setSearch] = useState(params.get("q") ?? "");
  const debouncedSearch = useDebouncedValue(search, 350);
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(null);
    adminApi
      .users({ q: debouncedSearch || undefined, status, role, page, pageSize: 20 })
      .then((result) => {
        if (!active) return;
        setUsers(result.items);
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
  }, [debouncedSearch, status, role, page]);

  function updateFilter(key: string, value: string) {
    setPage(1);
    setParams((current) => {
      const updated = new URLSearchParams(current);
      if (value === "all") updated.delete(key);
      else updated.set(key, value);
      return updated;
    });
  }

  return (
    <div>
      <PageHeader
        eyebrow="Admin console"
        title="User management"
        subtitle="Find accounts, review roles, and respond to trust and safety issues."
      />

      <div className="card mb-4 p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search name, email, or phone…"
              className="input w-full pl-9"
              aria-label="Search users"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select value={status} onChange={(event) => updateFilter("status", event.target.value)} className="select w-auto text-xs" aria-label="Filter by status">
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="deactivated">Deactivated</option>
            </select>
            <select value={role} onChange={(event) => updateFilter("role", event.target.value)} className="select w-auto text-xs" aria-label="Filter by role">
              <option value="all">All roles</option>
              <option value="buyer">Buyers</option>
              <option value="seller">Sellers</option>
              <option value="admin">Admins</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingBlock label="Loading users…" />
      ) : loadError ? (
        <ErrorState message={loadError} />
      ) : users.length === 0 ? (
        <EmptyState title="No users found" description="Try adjusting your search or filters." icon={<Users className="h-6 w-6" aria-hidden />} />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-gray-200 bg-white lg:block">
            <table className="data-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Roles</th>
                  <th>Status</th>
                  <th>Products</th>
                  <th>Reports</th>
                  <th>Joined</th>
                  <th className="text-right">Details</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <p className="font-medium">{user.fullName}</p>
                      <p className="text-[11px] text-charcoal/45">{user.email}{user.phone ? ` · ${user.phone}` : ""}</p>
                      {user.businessName ? <p className="text-[11px] text-forest-700">{user.businessName}</p> : null}
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {user.roles.map((item) => (
                          <Badge key={item} tone={item === "admin" ? "purple" : item === "seller" ? "green" : "gray"}>{item}</Badge>
                        ))}
                      </div>
                    </td>
                    <td><Badge tone={user.status === "active" ? "green" : user.status === "suspended" ? "red" : "gray"}>{user.status}</Badge></td>
                    <td className="text-xs">{user.productCount}</td>
                    <td className="text-xs">
                      {user.openReports > 0 ? <span className="font-semibold text-error">{user.openReports} open</span> : <span className="text-charcoal/40">None</span>}
                    </td>
                    <td className="text-xs text-charcoal/50">{formatDate(user.createdAt)}</td>
                    <td>
                      <div className="flex justify-end">
                        <Link to={`/admin/users/${user.id}`} className="btn-outline btn-sm">
                          <Eye className="h-4 w-4" aria-hidden />
                          Open
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 lg:hidden">
            {users.map((user) => (
              <Link key={user.id} to={`/admin/users/${user.id}`} className="card block p-3 transition hover:border-forest-300">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{user.fullName}</p>
                    <p className="truncate text-[11px] text-charcoal/45">{user.email}</p>
                    {user.businessName ? <p className="truncate text-[11px] text-forest-700">{user.businessName}</p> : null}
                  </div>
                  <Badge tone={user.status === "active" ? "green" : user.status === "suspended" ? "red" : "gray"}>{user.status}</Badge>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1">
                  {user.roles.map((roleName) => (
                    <Badge key={roleName} tone={roleName === "admin" ? "purple" : roleName === "seller" ? "green" : "gray"}>{roleName}</Badge>
                  ))}
                  <span className="ml-auto text-[10px] text-charcoal/40">{user.productCount} products · {user.openReports} reports</span>
                </div>
              </Link>
            ))}
          </div>

          {meta ? <Pagination className="mt-6" page={meta.page} totalPages={meta.totalPages} total={meta.total} onChange={setPage} /> : null}
        </>
      )}
    </div>
  );
}
