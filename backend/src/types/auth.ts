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
