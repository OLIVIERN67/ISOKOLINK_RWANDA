import axios, { AxiosError } from "axios";
import { currentLanguage, translateCurrent } from "../i18n";
import type {
  AdminStats,
  AdminUserDetail,
  AdminUserSummary,
  Announcement,
  AuditLog,
  AuthUser,
  BuyerStats,
  Category,
  Conversation,
  ConversationSummary,
  DistrictLocation,
  LocationsResponse,
  Market,
  MarketObservation,
  MyProfile,
  NotificationItem,
  PriceComparison,
  Product,
  PublicSeller,
  ReportItem,
  SellerProfile,
  SellerStats,
  Unit,
} from "../types";

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiErrorShape {
  message: string;
  code?: string;
  details?: Array<{ field: string; message: string }>;
}

function resolveApiBaseUrl(value: string | undefined): string {
  const configured = value?.trim().replace(/\/+$/, "");
  if (!configured) return "/api";
  return configured.endsWith("/api") ? configured : `${configured}/api`;
}

export const api = axios.create({
  baseURL: resolveApiBaseUrl(import.meta.env.VITE_API_URL),
  withCredentials: true,
  timeout: 20000,
  headers: { Accept: "application/json" },
});

api.interceptors.request.use((config) => {
  config.headers.set("Accept-Language", currentLanguage());
  return config;
});

export function getApiError(error: unknown): ApiErrorShape {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ error?: { message?: string; code?: string; details?: unknown } }>;
    const payload = axiosError.response?.data?.error;
    const details = Array.isArray(payload?.details)
      ? (payload.details as Array<{ field: string; message: string }>)
      : undefined;
    if (payload?.message) return { message: payload.message, code: payload.code, details };
    if (axiosError.code === "ECONNABORTED") {
      return { message: translateCurrent("errors.timeout", "The request timed out. Please try again.") };
    }
    if (!axiosError.response) {
      return { message: translateCurrent("errors.network", "Cannot reach the server. Check your connection.") };
    }
    return { message: translateCurrent("errors.generic", "The request could not be completed.") };
  }
  if (error instanceof Error) return { message: error.message };
  return { message: translateCurrent("errors.unexpected", "Something went wrong.") };
}

export interface ListResult<T> {
  items: T[];
  meta: Record<string, unknown>;
}

function unwrap<T>(response: { data: ApiEnvelope<T> }): T {
  return response.data.data;
}

function list<T>(response: { data: ApiEnvelope<T[]>; meta?: Record<string, unknown> }): ListResult<T> {
  return { items: response.data.data, meta: response.data.meta ?? {} };
}

// ---------- Auth ----------
export const authApi = {
  me: async () => unwrap(await api.get<ApiEnvelope<{ user: AuthUser }>>("/auth/me")).user,
  login: async (payload: { email: string; password: string }) =>
    unwrap(await api.post<ApiEnvelope<{ user: AuthUser }>>("/auth/login", payload)).user,
  register: async (payload: {
    fullName: string;
    email: string;
    password: string;
    phone?: string;
    preferredLanguage?: string;
    acceptTerms: true;
  }) =>
    unwrap(
      await api.post<
        ApiEnvelope<{
          user: AuthUser;
          emailDelivered: boolean;
          devVerificationToken?: string;
        }>
      >("/auth/register", payload),
    ),
  logout: async () => {
    await api.post("/auth/logout");
  },
  verifyEmail: async (token: string) => unwrap(await api.post<ApiEnvelope<{ message: string }>>("/auth/verify-email", { token })),
  resendVerification: async () =>
    unwrap(await api.post<ApiEnvelope<{ message: string; devVerificationToken?: string }>>("/auth/resend-verification")),
  forgotPassword: async (email: string) =>
    unwrap(await api.post<ApiEnvelope<{ message: string; devResetToken?: string }>>("/auth/forgot-password", { email })),
  resetPassword: async (token: string, password: string) =>
    unwrap(await api.post<ApiEnvelope<{ message: string }>>("/auth/reset-password", { token, password })),
  changePassword: async (currentPassword: string, newPassword: string) =>
    unwrap(await api.post<ApiEnvelope<{ message: string }>>("/auth/change-password", { currentPassword, newPassword })),
};

// ---------- Users / sellers ----------
export const userApi = {
  me: async () => unwrap(await api.get<ApiEnvelope<MyProfile>>("/users/me")),
  update: async (payload: {
    fullName?: string;
    phone?: string | null;
    preferredLanguage?: string;
    notificationEmailEnabled?: boolean;
  }) => unwrap(await api.patch<ApiEnvelope<MyProfile>>("/users/me", payload)),
  stats: async () => unwrap(await api.get<ApiEnvelope<BuyerStats>>("/users/me/stats")),
  savedProducts: async (page = 1, pageSize = 12) =>
    list(await api.get<ApiEnvelope<Product[]>>("/users/me/saved-products", { params: { page, pageSize } })),
  save: async (productId: number) => unwrap(await api.post<ApiEnvelope<{ saved: boolean }>>(`/users/me/saved-products/${productId}`)),
  unsave: async (productId: number) =>
    unwrap(await api.delete<ApiEnvelope<{ saved: boolean }>>(`/users/me/saved-products/${productId}`)),
  becomeSeller: async (payload: Record<string, unknown>) =>
    unwrap(await api.post<ApiEnvelope<SellerProfile>>("/users/me/become-seller", payload)),
  sellerProfile: async () => unwrap(await api.get<ApiEnvelope<SellerProfile>>("/users/me/seller-profile")),
  updateSellerProfile: async (payload: Record<string, unknown>) =>
    unwrap(await api.patch<ApiEnvelope<SellerProfile>>("/users/me/seller-profile", payload)),
  publicSeller: async (id: number) => unwrap(await api.get<ApiEnvelope<PublicSeller>>(`/sellers/${id}`)),
  deactivate: async () => unwrap(await api.post<ApiEnvelope<{ message: string }>>("/users/me/deactivate")),
};

// ---------- Reference data ----------
export const referenceApi = {
  categories: async () => unwrap(await api.get<ApiEnvelope<Category[]>>("/categories")),
  locations: async () => unwrap(await api.get<ApiEnvelope<LocationsResponse>>("/locations")),
  markets: async (locationId?: number) =>
    unwrap(await api.get<ApiEnvelope<Market[]>>("/markets", { params: locationId ? { locationId } : {} })),
  units: async () => unwrap(await api.get<ApiEnvelope<Unit[]>>("/units")),
  announcements: async (audience?: "all" | "buyers" | "sellers") =>
    unwrap(await api.get<ApiEnvelope<Announcement[]>>("/announcements", { params: audience ? { audience } : {} })),
};

// ---------- Products ----------
export interface ProductQuery {
  q?: string;
  categoryId?: number;
  category?: string;
  locationId?: number;
  marketId?: number;
  unitId?: number;
  sellerId?: number;
  minPrice?: number;
  maxPrice?: number;
  sort?: "newest" | "price_asc" | "price_desc" | "featured";
  page?: number;
  pageSize?: number;
}

export const productApi = {
  list: async (params: ProductQuery = {}) =>
    list(await api.get<ApiEnvelope<Product[]>>("/products", { params })),
  get: async (id: number) => unwrap(await api.get<ApiEnvelope<Product>>(`/products/${id}`)),
  approvalHistory: async (id: number) =>
    unwrap(await api.get<ApiEnvelope<Product["approvalHistory"]>>(`/products/${id}/approval-history`)),
  sellerList: async (params: Record<string, unknown> = {}) =>
    list(await api.get<ApiEnvelope<Product[]>>("/seller/products", { params })),
  sellerGet: async (id: number) => unwrap(await api.get<ApiEnvelope<Product>>(`/seller/products/${id}`)),
  create: async (payload: Record<string, unknown>) =>
    unwrap(await api.post<ApiEnvelope<Product>>("/seller/products", payload)),
  update: async (id: number, payload: Record<string, unknown>) =>
    unwrap(await api.patch<ApiEnvelope<Product>>(`/seller/products/${id}`, payload)),
  setAvailability: async (id: number, availability: string, quantity?: number) =>
    unwrap(
      await api.patch<ApiEnvelope<Product>>(`/seller/products/${id}/availability`, { availability, quantity }),
    ),
  archive: async (id: number) => {
    await api.delete(`/seller/products/${id}`);
  },
  stats: async () => unwrap(await api.get<ApiEnvelope<SellerStats>>("/seller/stats")),
  uploadImage: async (file: File) => {
    const form = new FormData();
    form.append("image", file);
    return unwrap(
      await api.post<ApiEnvelope<{ url: string }>>("/uploads/product-image", form, {
        headers: { "Content-Type": "multipart/form-data" },
      }),
    );
  },
  uploadProfileImage: async (file: File) => {
    const form = new FormData();
    form.append("image", file);
    return unwrap(
      await api.post<ApiEnvelope<{ url: string }>>("/uploads/profile-image", form, {
        headers: { "Content-Type": "multipart/form-data" },
      }),
    );
  },
};

// ---------- Market prices ----------
export interface ObservationQuery {
  q?: string;
  categoryId?: number;
  marketId?: number;
  locationId?: number;
  unitId?: number;
  verificationStatus?: "verified" | "unverified";
  from?: string;
  to?: string;
  sort?: "newest" | "price_asc" | "price_desc";
  page?: number;
  pageSize?: number;
}

export const priceApi = {
  list: async (params: ObservationQuery = {}) =>
    list(await api.get<ApiEnvelope<MarketObservation[]>>("/market-prices", { params })),
  compare: async (params: { q: string; categoryId?: number; locationId?: number; unitId?: number; marketId?: number }) =>
    unwrap(await api.get<ApiEnvelope<PriceComparison>>("/market-prices/compare", { params })),
  get: async (id: number) => unwrap(await api.get<ApiEnvelope<MarketObservation>>(`/market-prices/${id}`)),
};

// ---------- Messaging ----------
export const messagingApi = {
  conversations: async (params: { q?: string; page?: number; pageSize?: number } = {}) =>
    list(await api.get<ApiEnvelope<ConversationSummary[]>>("/conversations", { params })),
  get: async (id: number) => unwrap(await api.get<ApiEnvelope<Conversation>>(`/conversations/${id}`)),
  start: async (payload: { recipientId: number; productId?: number; subject?: string; message: string }) =>
    unwrap(await api.post<ApiEnvelope<Conversation>>("/conversations", payload)),
  send: async (id: number, body: string) =>
    unwrap(await api.post<ApiEnvelope<Conversation["messages"][number]>>(`/conversations/${id}/messages`, { body })),
  markRead: async (id: number) => unwrap(await api.post<ApiEnvelope<{ read: boolean }>>(`/conversations/${id}/read`)),
  unreadCount: async () => unwrap(await api.get<ApiEnvelope<{ count: number }>>("/conversations/unread-count")),
};

// ---------- Notifications ----------
export const notificationApi = {
  list: async (params: { page?: number; pageSize?: number; unreadOnly?: boolean } = {}) =>
    list(await api.get<ApiEnvelope<NotificationItem[]>>("/notifications", { params })),
  unreadCount: async () => unwrap(await api.get<ApiEnvelope<{ count: number }>>("/notifications/unread-count")),
  markRead: async (id: number) => unwrap(await api.post<ApiEnvelope<{ read: boolean }>>(`/notifications/${id}/read`)),
  markAllRead: async () => unwrap(await api.post<ApiEnvelope<{ read: boolean }>>("/notifications/read-all")),
};

// ---------- Reports ----------
export const reportApi = {
  create: async (payload: { productId?: number; reportedUserId?: number; reason: string; details: string }) =>
    unwrap(await api.post<ApiEnvelope<{ id: number; message: string }>>("/reports", payload)),
  mine: async () => unwrap(await api.get<ApiEnvelope<ReportItem[]>>("/reports/mine")),
};

// ---------- Admin ----------
export const adminApi = {
  stats: async () => unwrap(await api.get<ApiEnvelope<AdminStats>>("/admin/stats")),
  products: async (params: Record<string, unknown> = {}) =>
    list(await api.get<ApiEnvelope<Product[]>>("/admin/products", { params })),
  product: async (id: number) => unwrap(await api.get<ApiEnvelope<Product>>(`/admin/products/${id}`)),
  approveProduct: async (id: number, reason?: string) =>
    unwrap(await api.post<ApiEnvelope<Product>>(`/admin/products/${id}/approve`, { reason })),
  rejectProduct: async (id: number, reason: string) =>
    unwrap(await api.post<ApiEnvelope<Product>>(`/admin/products/${id}/reject`, { reason })),
  requestCorrection: async (id: number, reason: string) =>
    unwrap(await api.post<ApiEnvelope<Product>>(`/admin/products/${id}/request-correction`, { reason })),
  suspendProduct: async (id: number, reason: string) =>
    unwrap(await api.post<ApiEnvelope<Product>>(`/admin/products/${id}/suspend`, { reason })),
  reinstateProduct: async (id: number, reason?: string) =>
    unwrap(await api.post<ApiEnvelope<Product>>(`/admin/products/${id}/reinstate`, { reason })),
  featureProduct: async (id: number, isFeatured: boolean) =>
    unwrap(await api.patch<ApiEnvelope<Product>>(`/admin/products/${id}/feature`, { isFeatured })),
  users: async (params: Record<string, unknown> = {}) =>
    list(await api.get<ApiEnvelope<AdminUserSummary[]>>("/admin/users", { params })),
  user: async (id: number) => unwrap(await api.get<ApiEnvelope<AdminUserDetail>>(`/admin/users/${id}`)),
  suspendUser: async (id: number, reason: string) =>
    unwrap(await api.post<ApiEnvelope<AdminUserDetail>>(`/admin/users/${id}/suspend`, { reason })),
  reactivateUser: async (id: number) =>
    unwrap(await api.post<ApiEnvelope<AdminUserDetail>>(`/admin/users/${id}/reactivate`)),
  changeRole: async (id: number, role: "admin" | "seller", action: "grant" | "revoke") =>
    unwrap(await api.post<ApiEnvelope<AdminUserDetail>>(`/admin/users/${id}/roles`, { role, action })),
  reports: async (params: Record<string, unknown> = {}) =>
    list(await api.get<ApiEnvelope<ReportItem[]>>("/admin/reports", { params })),
  updateReport: async (id: number, status: string, resolutionNote?: string) =>
    unwrap(await api.patch<ApiEnvelope<{ id: number; status: string }>>(`/admin/reports/${id}`, { status, resolutionNote })),
  auditLogs: async (params: Record<string, unknown> = {}) =>
    list(await api.get<ApiEnvelope<AuditLog[]>>("/admin/audit-logs", { params })),
  adminCategories: async () => unwrap(await api.get<ApiEnvelope<Category[]>>("/admin/categories")),
  createCategory: async (payload: Record<string, unknown>) =>
    unwrap(await api.post<ApiEnvelope<Category>>("/admin/categories", payload)),
  updateCategory: async (id: number, payload: Record<string, unknown>) =>
    unwrap(await api.patch<ApiEnvelope<Category>>(`/admin/categories/${id}`, payload)),
  deleteCategory: async (id: number) =>
    unwrap(await api.delete<ApiEnvelope<{ deleted: boolean; deactivated: boolean }>>(`/admin/categories/${id}`)),
  adminMarkets: async () => unwrap(await api.get<ApiEnvelope<Market[]>>("/admin/markets")),
  createMarket: async (payload: Record<string, unknown>) =>
    unwrap(await api.post<ApiEnvelope<Market>>("/admin/markets", payload)),
  updateMarket: async (id: number, payload: Record<string, unknown>) =>
    unwrap(await api.patch<ApiEnvelope<Market>>(`/admin/markets/${id}`, payload)),
  deleteMarket: async (id: number) =>
    unwrap(await api.delete<ApiEnvelope<{ deleted: boolean; deactivated: boolean }>>(`/admin/markets/${id}`)),
  adminLocations: async () => unwrap(await api.get<ApiEnvelope<LocationsResponse>>("/admin/locations")),
  createLocation: async (payload: Record<string, unknown>) =>
    unwrap(await api.post<ApiEnvelope<DistrictLocation>>("/admin/locations", payload)),
  deleteLocation: async (id: number) =>
    unwrap(await api.delete<ApiEnvelope<{ deleted: boolean }>>(`/admin/locations/${id}`)),
  adminUnits: async () => unwrap(await api.get<ApiEnvelope<Unit[]>>("/admin/units")),
  createUnit: async (payload: Record<string, unknown>) =>
    unwrap(await api.post<ApiEnvelope<Unit>>("/admin/units", payload)),
  updateUnit: async (id: number, payload: Record<string, unknown>) =>
    unwrap(await api.patch<ApiEnvelope<Unit>>(`/admin/units/${id}`, payload)),
  createObservation: async (payload: Record<string, unknown>) =>
    unwrap(await api.post<ApiEnvelope<MarketObservation>>("/admin/market-prices", payload)),
  updateObservation: async (id: number, payload: Record<string, unknown>) =>
    unwrap(await api.patch<ApiEnvelope<MarketObservation>>(`/admin/market-prices/${id}`, payload)),
  deleteObservation: async (id: number) =>
    unwrap(await api.delete<ApiEnvelope<{ deleted: boolean }>>(`/admin/market-prices/${id}`)),
  announcements: async () => unwrap(await api.get<ApiEnvelope<Announcement[]>>("/admin/announcements")),
  createAnnouncement: async (payload: Record<string, unknown>) =>
    unwrap(await api.post<ApiEnvelope<Announcement>>("/admin/announcements", payload)),
  updateAnnouncement: async (id: number, payload: Record<string, unknown>) =>
    unwrap(await api.patch<ApiEnvelope<Announcement>>(`/admin/announcements/${id}`, payload)),
  deleteAnnouncement: async (id: number) => {
    await api.delete(`/admin/announcements/${id}`);
  },
  startConversation: async (payload: { recipientId: number; subject?: string; message: string }) =>
    unwrap(await api.post<ApiEnvelope<Conversation>>("/conversations", payload)),
};
