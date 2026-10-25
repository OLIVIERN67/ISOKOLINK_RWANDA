import { Route, Routes } from "react-router-dom";
import { PublicLayout } from "./components/PublicLayout";
import { DashboardLayout } from "./components/DashboardLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ConversationsView } from "./components/ConversationsView";
import { NotificationsView } from "./components/NotificationsView";
import { ScrollToTop } from "./components/ScrollToTop";
import { AuthLayout } from "./pages/auth/AuthLayout";
import { LoginPage } from "./pages/auth/LoginPage";
import { RegisterPage } from "./pages/auth/RegisterPage";
import { ForgotPasswordPage } from "./pages/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/auth/ResetPasswordPage";
import { VerifyEmailPage } from "./pages/auth/VerifyEmailPage";
import { HomePage } from "./pages/HomePage";
import { ProductsPage } from "./pages/ProductsPage";
import { ProductDetailPage } from "./pages/ProductDetailPage";
import { PricesPage } from "./pages/PricesPage";
import { SellerStorefrontPage } from "./pages/SellerStorefrontPage";
import { AboutPage } from "./pages/AboutPage";
import { ContactPage } from "./pages/ContactPage";
import { FaqPage } from "./pages/FaqPage";
import { PrivacyPage } from "./pages/PrivacyPage";
import { TermsPage } from "./pages/TermsPage";
import { NotAuthorizedPage } from "./pages/NotAuthorizedPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { DashboardHomePage } from "./pages/dashboard/DashboardHomePage";
import { BrowseProductsPage } from "./pages/dashboard/BrowseProductsPage";
import { SavedProductsPage } from "./pages/dashboard/SavedProductsPage";
import { BuyerReportsPage } from "./pages/dashboard/BuyerReportsPage";
import { ProfilePage } from "./pages/dashboard/ProfilePage";
import { SecurityPage } from "./pages/dashboard/SecurityPage";
import { BecomeSellerPage } from "./pages/dashboard/BecomeSellerPage";
import { SwitchWorkspacePage } from "./pages/dashboard/SwitchWorkspacePage";
import { SellerDashboardPage } from "./pages/seller/SellerDashboardPage";
import { SellerProductsPage } from "./pages/seller/SellerProductsPage";
import { SellerProductFormPage } from "./pages/seller/SellerProductFormPage";
import { SellerProfilePage } from "./pages/seller/SellerProfilePage";
import { AdminDashboardPage } from "./pages/admin/AdminDashboardPage";
import { AdminProductsPage } from "./pages/admin/AdminProductsPage";
import { AdminProductDetailPage } from "./pages/admin/AdminProductDetailPage";
import { AdminReportsPage } from "./pages/admin/AdminReportsPage";
import { AdminPricesPage } from "./pages/admin/AdminPricesPage";
import { AdminCategoriesPage } from "./pages/admin/AdminCategoriesPage";
import { AdminMarketsPage } from "./pages/admin/AdminMarketsPage";
import { AdminLocationsPage } from "./pages/admin/AdminLocationsPage";
import { AdminUnitsPage } from "./pages/admin/AdminUnitsPage";
import { AdminUsersPage } from "./pages/admin/AdminUsersPage";
import { AdminUserDetailPage } from "./pages/admin/AdminUserDetailPage";
import { AdminAnnouncementsPage } from "./pages/admin/AdminAnnouncementsPage";
import { AdminAuditLogsPage } from "./pages/admin/AdminAuditLogsPage";

export function App() {
  return (
    <>
      <ScrollToTop />
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
    </>
  );
}
