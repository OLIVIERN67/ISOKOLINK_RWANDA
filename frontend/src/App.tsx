import { lazy, Suspense, type ComponentType } from "react";
import { Route, Routes } from "react-router-dom";
import { PublicLayout } from "./components/PublicLayout";
import { DashboardLayout } from "./components/DashboardLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ScrollToTop } from "./components/ScrollToTop";
import { AuthLayout } from "./pages/auth/AuthLayout";
import { LoadingPage } from "./components/ui/States";

function lazyNamed<T extends Record<K, ComponentType<any>>, K extends keyof T>(loader: () => Promise<T>, key: K) {
  return lazy(async () => ({ default: (await loader())[key] }));
}

const ConversationsView = lazyNamed(() => import("./components/ConversationsView"), "ConversationsView");
const NotificationsView = lazyNamed(() => import("./components/NotificationsView"), "NotificationsView");
const LoginPage = lazyNamed(() => import("./pages/auth/LoginPage"), "LoginPage");
const RegisterPage = lazyNamed(() => import("./pages/auth/RegisterPage"), "RegisterPage");
const ForgotPasswordPage = lazyNamed(() => import("./pages/auth/ForgotPasswordPage"), "ForgotPasswordPage");
const ResetPasswordPage = lazyNamed(() => import("./pages/auth/ResetPasswordPage"), "ResetPasswordPage");
const VerifyEmailPage = lazyNamed(() => import("./pages/auth/VerifyEmailPage"), "VerifyEmailPage");
const HomePage = lazyNamed(() => import("./pages/HomePage"), "HomePage");
const ProductsPage = lazyNamed(() => import("./pages/ProductsPage"), "ProductsPage");
const ProductDetailPage = lazyNamed(() => import("./pages/ProductDetailPage"), "ProductDetailPage");
const PricesPage = lazyNamed(() => import("./pages/PricesPage"), "PricesPage");
const SellerStorefrontPage = lazyNamed(() => import("./pages/SellerStorefrontPage"), "SellerStorefrontPage");
const AboutPage = lazyNamed(() => import("./pages/AboutPage"), "AboutPage");
const ContactPage = lazyNamed(() => import("./pages/ContactPage"), "ContactPage");
const FaqPage = lazyNamed(() => import("./pages/FaqPage"), "FaqPage");
const PrivacyPage = lazyNamed(() => import("./pages/PrivacyPage"), "PrivacyPage");
const TermsPage = lazyNamed(() => import("./pages/TermsPage"), "TermsPage");
const AnnouncementPage = lazyNamed(() => import("./pages/AnnouncementPage"), "AnnouncementPage");
const NotAuthorizedPage = lazyNamed(() => import("./pages/NotAuthorizedPage"), "NotAuthorizedPage");
const NotFoundPage = lazyNamed(() => import("./pages/NotFoundPage"), "NotFoundPage");
const DashboardHomePage = lazyNamed(() => import("./pages/dashboard/DashboardHomePage"), "DashboardHomePage");
const BrowseProductsPage = lazyNamed(() => import("./pages/dashboard/BrowseProductsPage"), "BrowseProductsPage");
const SavedProductsPage = lazyNamed(() => import("./pages/dashboard/SavedProductsPage"), "SavedProductsPage");
const BuyerReportsPage = lazyNamed(() => import("./pages/dashboard/BuyerReportsPage"), "BuyerReportsPage");
const ProfilePage = lazyNamed(() => import("./pages/dashboard/ProfilePage"), "ProfilePage");
const SecurityPage = lazyNamed(() => import("./pages/dashboard/SecurityPage"), "SecurityPage");
const BecomeSellerPage = lazyNamed(() => import("./pages/dashboard/BecomeSellerPage"), "BecomeSellerPage");
const SwitchWorkspacePage = lazyNamed(() => import("./pages/dashboard/SwitchWorkspacePage"), "SwitchWorkspacePage");
const SellerDashboardPage = lazyNamed(() => import("./pages/seller/SellerDashboardPage"), "SellerDashboardPage");
const SellerProductsPage = lazyNamed(() => import("./pages/seller/SellerProductsPage"), "SellerProductsPage");
const SellerProductFormPage = lazyNamed(() => import("./pages/seller/SellerProductFormPage"), "SellerProductFormPage");
const SellerProfilePage = lazyNamed(() => import("./pages/seller/SellerProfilePage"), "SellerProfilePage");
const AdminDashboardPage = lazyNamed(() => import("./pages/admin/AdminDashboardPage"), "AdminDashboardPage");
const AdminProductsPage = lazyNamed(() => import("./pages/admin/AdminProductsPage"), "AdminProductsPage");
const AdminProductDetailPage = lazyNamed(() => import("./pages/admin/AdminProductDetailPage"), "AdminProductDetailPage");
const AdminReportsPage = lazyNamed(() => import("./pages/admin/AdminReportsPage"), "AdminReportsPage");
const AdminPricesPage = lazyNamed(() => import("./pages/admin/AdminPricesPage"), "AdminPricesPage");
const AdminCategoriesPage = lazyNamed(() => import("./pages/admin/AdminCategoriesPage"), "AdminCategoriesPage");
const AdminMarketsPage = lazyNamed(() => import("./pages/admin/AdminMarketsPage"), "AdminMarketsPage");
const AdminLocationsPage = lazyNamed(() => import("./pages/admin/AdminLocationsPage"), "AdminLocationsPage");
const AdminUnitsPage = lazyNamed(() => import("./pages/admin/AdminUnitsPage"), "AdminUnitsPage");
const AdminUsersPage = lazyNamed(() => import("./pages/admin/AdminUsersPage"), "AdminUsersPage");
const AdminUserDetailPage = lazyNamed(() => import("./pages/admin/AdminUserDetailPage"), "AdminUserDetailPage");
const AdminAnnouncementsPage = lazyNamed(() => import("./pages/admin/AdminAnnouncementsPage"), "AdminAnnouncementsPage");
const AdminAuditLogsPage = lazyNamed(() => import("./pages/admin/AdminAuditLogsPage"), "AdminAuditLogsPage");

export function App() {
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<LoadingPage label="Loading page…" />}>
        <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<HomePage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="products/:id" element={<ProductDetailPage />} />
          <Route path="prices" element={<PricesPage />} />
          <Route path="sellers/:id" element={<SellerStorefrontPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="contact" element={<ContactPage />} />
          <Route path="faq" element={<FaqPage />} />
          <Route path="privacy" element={<PrivacyPage />} />
          <Route path="terms" element={<TermsPage />} />
          <Route path="announcements/:id" element={<AnnouncementPage />} />
          <Route path="not-authorized" element={<NotAuthorizedPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        <Route element={<AuthLayout />}>
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="forgot-password" element={<ForgotPasswordPage />} />
          <Route path="reset-password" element={<ResetPasswordPage />} />
          <Route path="verify-email" element={<VerifyEmailPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="dashboard" element={<DashboardLayout variant="buyer" />}>
            <Route index element={<DashboardHomePage />} />
            <Route path="browse" element={<BrowseProductsPage />} />
            <Route path="compare" element={<PricesPage />} />
            <Route path="saved" element={<SavedProductsPage />} />
            <Route path="conversations" element={<ConversationsView basePath="/dashboard/conversations" />} />
            <Route path="conversations/:id" element={<ConversationsView basePath="/dashboard/conversations" />} />
            <Route path="notifications" element={<NotificationsView />} />
            <Route path="reports" element={<BuyerReportsPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="settings" element={<SecurityPage />} />
            <Route path="become-seller" element={<BecomeSellerPage />} />
            <Route path="switch" element={<SwitchWorkspacePage />} />
          </Route>

          <Route element={<ProtectedRoute role="seller" />}>
            <Route path="seller" element={<DashboardLayout variant="seller" />}>
              <Route index element={<SellerDashboardPage />} />
              <Route path="products" element={<SellerProductsPage />} />
              <Route path="products/new" element={<SellerProductFormPage />} />
              <Route path="products/:id/edit" element={<SellerProductFormPage />} />
              <Route path="conversations" element={<ConversationsView basePath="/seller/conversations" />} />
              <Route path="conversations/:id" element={<ConversationsView basePath="/seller/conversations" />} />
              <Route path="notifications" element={<NotificationsView />} />
              <Route path="profile" element={<SellerProfilePage />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute role="admin" />}>
            <Route path="admin" element={<DashboardLayout variant="admin" />}>
              <Route index element={<AdminDashboardPage />} />
              <Route path="products" element={<AdminProductsPage />} />
              <Route path="products/:id" element={<AdminProductDetailPage />} />
              <Route path="reports" element={<AdminReportsPage />} />
              <Route path="prices" element={<AdminPricesPage />} />
              <Route path="categories" element={<AdminCategoriesPage />} />
              <Route path="markets" element={<AdminMarketsPage />} />
              <Route path="locations" element={<AdminLocationsPage />} />
              <Route path="units" element={<AdminUnitsPage />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="users/:id" element={<AdminUserDetailPage />} />
              <Route path="conversations" element={<ConversationsView basePath="/admin/conversations" />} />
              <Route path="conversations/:id" element={<ConversationsView basePath="/admin/conversations" />} />
              <Route path="notifications" element={<NotificationsView />} />
              <Route path="announcements" element={<AdminAnnouncementsPage />} />
              <Route path="audit-logs" element={<AdminAuditLogsPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="settings" element={<SecurityPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </>
  );
}
