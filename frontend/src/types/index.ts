export interface AuthUser {
  id: number;
  email: string;
  fullName: string;
  phone: string | null;
  status: "active" | "suspended" | "deactivated";
  isEmailVerified: boolean;
  preferredLanguage: string;
  activeMode: "buyer" | "seller";
  notificationEmailEnabled: boolean;
  roles: string[];
  sellerProfileId: number | null;
  sellerBusinessName: string | null;
  sellerStatus: "active" | "suspended" | null;
  createdAt: string;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  isActive: boolean;
  productCount: number;
}

export interface Unit {
  id: number;
  code: string;
  label: string;
  dimension: string;
  factorToBase: number;
  isActive: boolean;
}

export interface DistrictLocation {
  id: number;
  name: string;
  provinceId: number | null;
  province: string | null;
}

export interface ProvinceLocation {
  id: number;
  name: string;
  type: string;
  districts: Array<{ id: number; name: string }>;
}

export interface LocationsResponse {
  provinces: ProvinceLocation[];
  districts: DistrictLocation[];
  total: number;
}

export interface Market {
  id: number;
  name: string;
  address: string | null;
  isActive: boolean;
  locationId: number;
  district: string;
  province: string | null;
}

export type ApprovalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "requires_correction"
  | "suspended";
export type Availability = "available" | "unavailable" | "sold";

export interface ProductSeller {
  id: number;
  fullName: string;
  businessName: string | null;
  profileImageUrl: string | null;
  description: string | null;
  phone: string | null;
  publicContactVisible: boolean;
  district: string | null;
  status: string | null;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  currency: string;
  quantity: number;
  availability: Availability;
  approvalStatus: ApprovalStatus;
  isFeatured: boolean;
  isArchived: boolean;
  rejectionReason: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  category: { id: number; name: string; slug: string };
  unit: { id: number; code: string; label: string; dimension: string; factorToBase: number };
  location: { id: number; district: string; province: string | null };
  market: { id: number; name: string } | null;
  seller: ProductSeller;
  primaryImage: string | null;
  imageCount: number;
  images?: Array<{ id: number; url: string; altText: string | null; isPrimary: boolean; sortOrder: number }>;
  isSaved?: boolean;
  approvalHistory?: Array<{
    id: number;
    action: string;
    reason: string | null;
    adminName: string | null;
    createdAt: string;
  }>;
}

export interface SellerProfile {
  id: number;
  userId: number;
  businessName: string;
  description: string | null;
  locationId: number | null;
  district: string | null;
  province: string | null;
  marketId: number | null;
  market: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  preferredContact: "message" | "phone" | "email";
  publicContactVisibility: boolean;
  profileImageUrl: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface PublicSeller {
  id: number;
  fullName: string;
  businessName: string;
  description: string | null;
  profileImageUrl: string | null;
  phone: string | null;
  publicContactVisible: boolean;
  preferredContact: string;
  district: string | null;
  province: string | null;
  market: string | null;
  memberSince: string;
  activeListings: number;
  status: string;
}

export interface MyProfile {
  id: number;
  email: string;
  fullName: string;
  phone: string | null;
  status: string;
  isEmailVerified: boolean;
  preferredLanguage: string;
  notificationEmailEnabled: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  roles: string[];
  sellerProfile: SellerProfile | null;
}

export interface MarketObservation {
  id: number;
  productName: string;
  price: number;
  currency: string;
  observedOn: string;
  source: string;
  verificationStatus: "verified" | "unverified";
  observedBy: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  category: { id: number; name: string; slug: string };
  market: { id: number; name: string } | null;
  location: { id: number; district: string; province: string | null };
  unit: { id: number; code: string; label: string; dimension: string; factorToBase: number };
  normalizedPrice: { value: number; per: string } | null;
  freshness: "fresh" | "aging" | "stale";
  daysOld: number;
  isStale: boolean;
  isVerified: boolean;
  sourceType: "market_observation";
}

export interface AdvertisedPrice {
  id: number;
  name: string;
  price: number;
  currency: string;
  updatedAt: string;
  seller: { id: number; name: string; businessName: string | null };
  location: { district: string };
  market: { name: string } | null;
  unit: { id: number; code: string; label: string; dimension: string; factorToBase: number };
  normalizedPrice: { value: number; per: string } | null;
  sourceType: "seller_advertised";
}

export interface PriceComparison {
  query: { q: string; categoryId: number | null; locationId: number | null };
  observations: MarketObservation[];
  advertised: AdvertisedPrice[];
  summary: Array<{
    productName: string;
    dimension: string;
    unitCode: string;
    sampleCount: number;
    verifiedFreshCount: number;
    staleCount: number;
    unverifiedCount: number;
    minPrice: number | null;
    maxPrice: number | null;
    averagePrice: number | null;
    normalizedMin: number | null;
    normalizedMax: number | null;
    normalizedUnit: string | null;
    insufficientData: boolean;
  }>;
  meta: {
    staleThresholdDays: number;
    observationCount: number;
    advertisedCount: number;
    disclaimer: string;
  };
}

export interface ConversationSummary {
  id: number;
  subject: string | null;
  productId: number | null;
  productName: string | null;
  status: string;
  lastMessageAt: string | null;
  createdAt: string;
  lastMessage: string | null;
  lastSenderId: number | null;
  unreadCount: number;
  otherUser: { id: number | null; name: string; businessName: string | null };
}

export interface Conversation {
  id: number;
  subject: string | null;
  status: string;
  productId: number | null;
  product: { id: number; name: string; price: number; currency: string } | null;
  createdAt: string;
  lastMessageAt: string | null;
  participants: Array<{
    id: number;
    name: string;
    businessName: string | null;
    roles: string[];
    status: string;
  }>;
  messages: Array<{
    id: number;
    senderId: number;
    senderName: string;
    senderBusinessName: string | null;
    body: string;
    imageUrl: string | null;
    createdAt: string;
    isMine: boolean;
  }>;
}

export interface NotificationItem {
  id: number;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  isRead: boolean;
  createdAt: string;
  readAt: string | null;
}

export interface ReportItem {
  id: number;
  reason: string;
  details: string | null;
  status: "open" | "under_review" | "resolved" | "dismissed";
  resolutionNote: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  product: { id: number; name: string } | null;
  reporter: { id: number; name: string; email: string };
  reportedUser: { id: number; name: string } | null;
  resolvedBy: { id: number; name: string } | null;
}

export interface Announcement {
  id: number;
  title: string;
  body: string;
  imageUrl: string | null;
  audience: "all" | "buyers" | "sellers";
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: { id: number; name: string } | null;
}

export interface AdminUserSummary {
  id: number;
  email: string;
  fullName: string;
  phone: string | null;
  status: string;
  isEmailVerified: boolean;
  preferredLanguage: string;
  createdAt: string;
  lastLoginAt: string | null;
  roles: string[];
  businessName: string | null;
  sellerStatus: string | null;
  sellerProfileId: number | null;
  productCount: number;
  openReports: number;
}

export interface AdminUserDetail extends AdminUserSummary {
  sellerProfile: SellerProfile | null;
  stats: {
    savedProducts: number;
    conversations: number;
    submittedReports: number;
    receivedReports: number;
    unreadNotifications: number;
  };
  recentProducts: Array<{
    id: number;
    name: string;
    price: number;
    currency: string;
    approvalStatus: string;
    availability: string;
    updatedAt: string;
  }>;
  recentReports: Array<{ id: number; reason: string; status: string; createdAt: string }>;
}

export interface AdminStats {
  totals: {
    users: number;
    activeUsers: number;
    suspendedUsers: number;
    buyers: number;
    sellers: number;
    activeSellers: number;
    products: number;
    pendingProducts: number;
    approvedProducts: number;
    rejectedProducts: number;
    correctionProducts: number;
    openReports: number;
    reviewReports: number;
    priceObservations: number;
    staleObservations: number;
    conversations: number;
    messages: number;
    announcements: number;
  };
  productStatus: Record<string, number>;
  categories: Array<{ name: string; count: number }>;
  activityTrend: Array<{ date: string; registrations: number; products: number }>;
  recentUsers: Array<{
    id: number;
    fullName: string;
    email: string;
    status: string;
    createdAt: string;
    roles: string[];
  }>;
  recentActivity: Array<{
    id: number;
    action: string;
    entityType: string;
    entityId: string | null;
    createdAt: string;
    actorName: string;
  }>;
}

export interface AuditLog {
  id: number;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
  actor: { id: number; name: string | null; email: string | null } | null;
}

export interface BuyerStats {
  savedProducts: number;
  conversations: number;
  unreadNotifications: number;
  unreadMessages: number;
}

export interface SellerStats {
  counts: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    requiresCorrection: number;
    suspended: number;
    sold: number;
    unavailable: number;
  };
  recentProducts: Product[];
  unreadMessages: number;
  recentMessages: Array<{
    conversationId: number;
    preview: string;
    sentAt: string;
    senderName: string;
    productName: string | null;
    isUnread: boolean;
  }>;
}
