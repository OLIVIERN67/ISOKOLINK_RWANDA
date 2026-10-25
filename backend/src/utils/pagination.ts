export interface Pagination {
  page: number;
  pageSize: number;
  offset: number;
}

export function getPagination(query: Record<string, unknown>, defaultSize = 12, maxSize = 60): Pagination {
  const page = Math.max(1, Number.parseInt(String(query.page ?? "1"), 10) || 1);
  const requested = Number.parseInt(String(query.pageSize ?? String(defaultSize)), 10) || defaultSize;
  const pageSize = Math.min(maxSize, Math.max(1, requested));
  return { page, pageSize, offset: (page - 1) * pageSize };
}

export function paginationMeta(total: number, pagination: Pagination) {
  return {
    page: pagination.page,
    pageSize: pagination.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pagination.pageSize)),
  };
}
