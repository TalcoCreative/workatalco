import { Toaster } from "@/components/ui/toaster";
import CEODashboard from "./pages/CEODashboard";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { PWAInstallPrompt } from "@/components/pwa/PWAInstallPrompt";
import { OfflineIndicator } from "@/components/pwa/OfflineIndicator";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import CompanyRoot from "./pages/CompanyRoot";
import Auth from "./pages/Auth";
import Landing from "./pages/Landing";
import Subscribe from "./pages/Subscribe";
import Index from "./pages/Index";
import Clients from "./pages/Clients";
import ClientDetail from "./pages/ClientDetail";
import Projects from "./pages/Projects";
import Tasks from "./pages/Tasks";
import Users from "./pages/Users";
import Schedule from "./pages/Schedule";
import Reports from "./pages/Reports";
import HRDashboard from "./pages/HRDashboard";
import HRAnalytics from "./pages/HRAnalytics";
import EmployeeInsight from "./pages/EmployeeInsight";
import ShootingSchedule from "./pages/ShootingSchedule";
import Leave from "./pages/Leave";
import Finance from "./pages/Finance";
import MyReimbursement from "./pages/MyReimbursement";
import Prospects from "./pages/Prospects";
import ProspectHistory from "./pages/ProspectHistory";
import SalesDashboard from "./pages/SalesDashboard";
import Performance from "./pages/Performance";
import Recruitment from "./pages/Recruitment";
import RecruitmentForms from "./pages/RecruitmentForms";
import RecruitmentDashboard from "./pages/RecruitmentDashboard";
import PublicApplyForm from "./pages/PublicApplyForm";
import Forms from "./pages/Forms";
import FormEditor from "./pages/FormEditor";
import FormResponses from "./pages/FormResponses";
import PublicForm from "./pages/PublicForm";
import Meeting from "./pages/Meeting";
import Asset from "./pages/Asset";
import Letters from "./pages/Letters";
import KolDatabase from "./pages/KolDatabase";
import KolCampaign from "./pages/KolCampaign";
import Event from "./pages/Event";
import EventDetail from "./pages/EventDetail";
import SharedTask from "./pages/SharedTask";
import SharedProject from "./pages/SharedProject";
import SharedShooting from "./pages/SharedShooting";
import SharedMeeting from "./pages/SharedMeeting";
import SocialMedia from "./pages/SocialMedia";
import SocialMediaModule from "./pages/SocialMediaModule";
import SocialMediaSettings from "./pages/SocialMediaSettings";
import SharedSocialMedia from "./pages/SharedSocialMedia";
import ContentBuilder from "./pages/ContentBuilder";
import EmailSettings from "./pages/EmailSettings";
import NotFound from "./pages/NotFound";
import SharedShortUrl from "./pages/SharedShortUrl";
import SharedClientDashboard from "./pages/SharedClientDashboard";
import SharedClientReports from "./pages/SharedClientReports";
import Holiday from "./pages/Holiday";
import EditorialPlan from "./pages/EditorialPlan";
import EditorialPlanEditor from "./pages/EditorialPlanEditor";
import PublicEditorialPlan from "./pages/PublicEditorialPlan";
import PublicEditorialPlanList from "./pages/PublicEditorialPlanList";
import PublicClientHub from "./pages/PublicClientHub";
import PublishedContentReport from "./pages/PublishedContentReport";
import PublicMeetingList from "./pages/PublicMeetingList";
import PublicShootingList from "./pages/PublicShootingList";
import RoleManagement from "./pages/RoleManagement";
import SuperAdmin from "./pages/SuperAdmin";
import RequestDemo from "./pages/RequestDemo";
import ThankYou from "./pages/ThankYou";
import AdminLogin from "./pages/AdminLogin";
import Pricing from "./pages/Pricing";
import Billing from "./pages/Billing";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import PersonalNotes from "./pages/PersonalNotes";
import ProfileSettings from "./pages/ProfileSettings";
import WorkspaceRedirect from "./pages/WorkspaceRedirect";
import SitemapRedirect from "./pages/SitemapRedirect";
import InstallApp from "./pages/InstallApp";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <OfflineIndicator />
      <PWAInstallPrompt />
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/landing" element={<Landing />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/subscribe" element={<Subscribe />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/request-demo" element={<RequestDemo />} />
          <Route path="/thank-you" element={<ThankYou />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogPost />} />

          {/* Sitemap */}
          <Route path="/sitemap.xml" element={<SitemapRedirect />} />

          {/* Default → auth */}
          <Route path="/" element={<Navigate to="/auth" replace />} />

          {/* Platform Admin (global, not per-company) */}
          <Route path="/platform-admin" element={<ProtectedRoute><SuperAdmin /></ProtectedRoute>} />

          {/* Public share routes */}
          <Route path="/apply/:companySlug/:slug" element={<PublicApplyForm />} />
          <Route path="/f/:companySlug/:slug" element={<PublicForm />} />
          <Route path="/ep/:clientSlug/:epSlug" element={<PublicEditorialPlan />} />
          <Route path="/ep-list/:clientSlug" element={<PublicEditorialPlanList />} />
          <Route path="/hub/:companySlug/:slug" element={<PublicClientHub />} />
          <Route path="/meeting-list/:companySlug/:clientSlug" element={<PublicMeetingList />} />
          <Route path="/shooting-list/:companySlug/:clientSlug" element={<PublicShootingList />} />
          <Route path="/social-media/client/:slug" element={<SharedSocialMedia />} />
          <Route path="/projects/task/:token" element={<SharedTask />} />
          <Route path="/share/task/:token" element={<SharedTask />} />
          <Route path="/share/project/:token" element={<SharedProject />} />
          <Route path="/share/shooting/:token" element={<SharedShooting />} />
          <Route path="/share/meeting/:token" element={<SharedMeeting />} />
          <Route path="/dashboard/:slug" element={<SharedClientDashboard />} />
          <Route path="/clients/public/:slug" element={<SharedClientDashboard />} />
          <Route path="/reports/:slug" element={<SharedClientReports />} />

          {/* Slug-prefixed workspace routes */}
          <Route path="/:companySlug" element={<ProtectedRoute><CompanyRoot /></ProtectedRoute>}>
            <Route index element={<Index />} />
            <Route path="clients" element={<Clients />} />
            <Route path="clients/:clientId" element={<ClientDetail />} />
            <Route path="projects" element={<Projects />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="users" element={<Users />} />
            <Route path="schedule" element={<Schedule />} />
            <Route path="reports" element={<Reports />} />
            <Route path="reports/published-content" element={<PublishedContentReport />} />
            <Route path="hr-dashboard" element={<HRDashboard />} />
            <Route path="hr/analytics" element={<HRAnalytics />} />
            <Route path="hr/employee/:id/insight" element={<EmployeeInsight />} />
            <Route path="hr/holiday" element={<Holiday />} />
            <Route path="shooting" element={<ShootingSchedule />} />
            <Route path="leave" element={<Leave />} />
            <Route path="finance" element={<Finance />} />
            <Route path="my-reimbursement" element={<MyReimbursement />} />
            <Route path="prospects" element={<Prospects />} />
            <Route path="prospects/history" element={<ProspectHistory />} />
            <Route path="sales/dashboard" element={<SalesDashboard />} />
            <Route path="performance" element={<Performance />} />
            <Route path="recruitment" element={<Recruitment />} />
            <Route path="recruitment/forms" element={<RecruitmentForms />} />
            <Route path="recruitment/dashboard" element={<RecruitmentDashboard />} />
            <Route path="forms" element={<Forms />} />
            <Route path="forms/:formId" element={<FormEditor />} />
            <Route path="forms/:formId/responses" element={<FormResponses />} />
            <Route path="meeting" element={<Meeting />} />
            <Route path="asset" element={<Asset />} />
            <Route path="letters" element={<Letters />} />
            <Route path="kol-database" element={<KolDatabase />} />
            <Route path="kol-campaign" element={<KolCampaign />} />
            <Route path="event" element={<Event />} />
            <Route path="event/:eventId" element={<EventDetail />} />
            <Route path="social-media" element={<SocialMediaModule />} />
            <Route path="social-media/settings" element={<SocialMediaSettings />} />
            <Route path="content-builder" element={<ContentBuilder />} />
            <Route path="editorial-plan" element={<EditorialPlan />} />
            <Route path="ep/:clientSlug/:epSlug/edit" element={<EditorialPlanEditor />} />
            <Route path="ceo-dashboard" element={<CEODashboard />} />
            <Route path="notes" element={<PersonalNotes />} />
            <Route path="profile" element={<ProfileSettings />} />
            <Route path="system/roles" element={<RoleManagement />} />
            <Route path="billing" element={<Billing />} />
          </Route>

          {/* Short URL catch-all */}
          <Route path="/s/:token" element={<SharedShortUrl />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;