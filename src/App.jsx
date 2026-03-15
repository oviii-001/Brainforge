import { Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import AppLayout from '@/components/layout/AppLayout';
import AuthLayout from '@/components/layout/AuthLayout';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import AdminRoute from '@/components/common/AdminRoute';
import Spinner from '@/components/ui/Spinner';

// Lazy-loaded pages
const LandingPage = lazy(() => import('@/pages/LandingPage'));
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/ForgotPasswordPage'));
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const ExplorePage = lazy(() => import('@/pages/ExplorePage'));
const IdeaDetailPage = lazy(() => import('@/pages/IdeaDetailPage'));
const CreateIdeaPage = lazy(() => import('@/pages/CreateIdeaPage'));
const EditIdeaPage = lazy(() => import('@/pages/EditIdeaPage'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const NotificationsPage = lazy(() => import('@/pages/NotificationsPage'));
const BookmarksPage = lazy(() => import('@/pages/BookmarksPage'));
const FeedPage = lazy(() => import('@/pages/FeedPage'));
const MessagesPage = lazy(() => import('@/pages/MessagesPage'));
const ConversationPage = lazy(() => import('@/pages/ConversationPage'));
const AdminPage = lazy(() => import('@/pages/AdminPage'));
const AboutPage = lazy(() => import('@/pages/AboutPage'));
const ContactPage = lazy(() => import('@/pages/ContactPage'));
const PrivacyPage = lazy(() => import('@/pages/PrivacyPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Spinner size="lg" />
    </div>
  );
}

function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Marketing / public routes — with footer */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
        </Route>

        {/* Auth routes — standalone layout */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        </Route>

        {/* App routes — sidebar layout, no footer */}
        <Route element={<AppLayout />}>
          {/* Public app pages (accessible without auth) */}
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/ideas/:id" element={<IdeaDetailPage />} />
          <Route path="/profile/:id" element={<ProfilePage />} />

          {/* Protected app pages */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/feed" element={<FeedPage />} />
            <Route path="/ideas/new" element={<CreateIdeaPage />} />
            <Route path="/ideas/:id/edit" element={<EditIdeaPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/bookmarks" element={<BookmarksPage />} />
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/messages/:id" element={<ConversationPage />} />
          </Route>

          {/* Admin pages */}
          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<AdminPage />} />
          </Route>
        </Route>

        {/* 404 — marketing layout with footer */}
        <Route element={<MainLayout />}>
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

export default App;
