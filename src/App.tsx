import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { AppProvider } from "@/contexts/AppContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { SettingsInitializer } from "@/components/SettingsInitializer";
import ProtectedRoute from "@/components/ProtectedRoute";
import ConnectionStatusBanner from "@/components/ConnectionStatusBanner";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useEffect, useState, lazy, Suspense } from "react";
import { isNativeMobile, platform } from "./capacitor";

// Eager loads — small/critical pages
import Landing from "./pages/Landing";
import PassengerAuth from "./pages/auth/PassengerAuth";
import PilotAuth from "./pages/auth/PilotAuth";
import AuthCallback from "./pages/auth/AuthCallback";
import SetPassword from "./pages/auth/SetPassword";
import TermsOfUse from "./pages/TermsOfUse";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import NotFound from "./pages/NotFound";
// Lazy loads — admin pages (never needed by passengers/pilots)
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminPilotApproval = lazy(() => import("./pages/admin/AdminPilotApproval"));
const AdminFinancial = lazy(() => import("./pages/admin/AdminFinancial"));
const AdminAds = lazy(() => import("./pages/admin/AdminAds"));
const AdminVouchers = lazy(() => import("./pages/admin/AdminVouchers"));
const AdminRides = lazy(() => import("./pages/admin/AdminRides"));
const InstallPage = lazy(() => import("./pages/Install"));

// Lazy loads — passenger pages
const PassengerHome = lazy(() => import("./pages/passenger/PassengerHome"));
const RequestRide = lazy(() => import("./pages/passenger/RequestRide"));
const SearchingPilot = lazy(() => import("./pages/passenger/SearchingPilot"));
const Tracking = lazy(() => import("./pages/passenger/Tracking"));
const InRide = lazy(() => import("./pages/passenger/InRide"));
const Completed = lazy(() => import("./pages/passenger/Completed"));
const RideHistory = lazy(() => import("./pages/passenger/RideHistory"));
const Profile = lazy(() => import("./pages/passenger/Profile"));
const Payment = lazy(() => import("./pages/passenger/Payment"));
const WalletPage = lazy(() => import("./pages/passenger/Wallet"));
const Favorites = lazy(() => import("./pages/passenger/Favorites"));
const Settings = lazy(() => import("./pages/passenger/Settings"));
const Referral = lazy(() => import("./pages/passenger/Referral"));
const Help = lazy(() => import("./pages/passenger/Help"));
const SavedCards = lazy(() => import("./pages/passenger/SavedCards"));

// Lazy loads — pilot pages
const PilotDashboard = lazy(() => import("./pages/pilot/PilotDashboard"));
const ActiveRide = lazy(() => import("./pages/pilot/ActiveRide"));
const RatePassenger = lazy(() => import("./pages/pilot/RatePassenger"));
const PilotHistory = lazy(() => import("./pages/pilot/PilotHistory"));
const PilotProfile = lazy(() => import("./pages/pilot/PilotProfile"));
const PilotProfileEdit = lazy(() => import("./pages/pilot/PilotProfileEdit"));
const Earnings = lazy(() => import("./pages/pilot/Earnings"));
const PilotSettings = lazy(() => import("./pages/pilot/PilotSettings"));
const PilotDocumentUpload = lazy(() => import("./pages/pilot/PilotDocumentUpload"));

const queryClient = new QueryClient();

// Routes where back button must NOT navigate away without confirmation (active ride/search)
const PROTECTED_BACK_ROUTES = [
  '/passenger/searching',
  '/passenger/tracking',
  '/passenger/in-ride',
];

// Handles Android hardware back button via Capacitor App plugin
function AndroidBackHandler() {
  const navigate = useNavigate();
  const [showBackConfirm, setShowBackConfirm] = useState(false);

  useEffect(() => {
    if (!isNativeMobile || platform !== 'android') return;
    let cleanup: (() => void) | undefined;
    import('@capacitor/app').then(({ App: CapApp }) => {
      const handler = CapApp.addListener('backButton', ({ canGoBack }) => {
        const path = window.location.pathname;
        const isProtected = PROTECTED_BACK_ROUTES.some(r => path.startsWith(r))
          || path.startsWith('/pilot/ride/');
        if (isProtected) {
          setShowBackConfirm(true);
        } else if (canGoBack) {
          navigate(-1);
        } else {
          CapApp.exitApp();
        }
      });
      cleanup = () => { handler.then(h => h.remove()); };
    });
    return () => { cleanup?.(); };
  }, [navigate]);

  if (!showBackConfirm) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/50 flex items-end justify-center p-4">
      <div className="bg-card rounded-2xl p-5 w-full max-w-sm">
        <p className="font-semibold text-foreground mb-1">Sair da corrida?</p>
        <p className="text-sm text-muted-foreground mb-4">Você ainda tem uma corrida ativa. Sair dessa tela não cancela a corrida.</p>
        <div className="flex gap-2">
          <button
            className="flex-1 py-2.5 rounded-xl bg-muted text-foreground text-sm font-medium"
            onClick={() => setShowBackConfirm(false)}
          >Ficar</button>
          <button
            className="flex-1 py-2.5 rounded-xl bg-destructive/10 text-destructive text-sm font-medium"
            onClick={() => { setShowBackConfirm(false); navigate(-1); }}
          >Sair mesmo assim</button>
        </div>
      </div>
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <SettingsInitializer>
        <AppProvider>
          <TooltipProvider>
            <ErrorBoundary>
            <BrowserRouter>
              <AndroidBackHandler />
              <ConnectionStatusBanner />
              <Toaster />
              <Sonner position="top-center" />
              <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}>
              <Routes>
                <Route path="/" element={<Landing />} />
                
                {/* Auth routes */}
                <Route path="/auth/passenger" element={<PassengerAuth />} />
                <Route path="/auth/pilot" element={<PilotAuth />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/auth/set-password" element={<SetPassword />} />
                
                {/* Passenger routes */}
                <Route path="/passenger" element={
                  <ProtectedRoute requiredRole="passenger">
                    <PassengerHome />
                  </ProtectedRoute>
                } />
                <Route path="/passenger/request" element={
                  <ProtectedRoute requiredRole="passenger">
                    <RequestRide />
                  </ProtectedRoute>
                } />
                <Route path="/passenger/searching" element={
                  <ProtectedRoute requiredRole="passenger">
                    <SearchingPilot />
                  </ProtectedRoute>
                } />
                <Route path="/passenger/tracking" element={
                  <ProtectedRoute requiredRole="passenger">
                    <Tracking />
                  </ProtectedRoute>
                } />
                <Route path="/passenger/in-ride" element={
                  <ProtectedRoute requiredRole="passenger">
                    <InRide />
                  </ProtectedRoute>
                } />
                <Route path="/passenger/completed" element={
                  <ProtectedRoute requiredRole="passenger">
                    <Completed />
                  </ProtectedRoute>
                } />
                <Route path="/passenger/history" element={
                  <ProtectedRoute requiredRole="passenger">
                    <RideHistory />
                  </ProtectedRoute>
                } />
                <Route path="/passenger/profile" element={
                  <ProtectedRoute requiredRole="passenger">
                    <Profile />
                  </ProtectedRoute>
                } />
                <Route path="/passenger/referral" element={
                  <ProtectedRoute requiredRole="passenger">
                    <Referral />
                  </ProtectedRoute>
                } />
                <Route path="/passenger/payment" element={
                  <ProtectedRoute requiredRole="passenger">
                    <Payment />
                  </ProtectedRoute>
                } />
                <Route path="/passenger/wallet" element={
                  <ProtectedRoute requiredRole="passenger">
                    <WalletPage />
                  </ProtectedRoute>
                } />
                <Route path="/passenger/favorites" element={
                  <ProtectedRoute requiredRole="passenger">
                    <Favorites />
                  </ProtectedRoute>
                } />
                <Route path="/passenger/settings" element={
                  <ProtectedRoute requiredRole="passenger">
                    <Settings />
                  </ProtectedRoute>
                } />
                <Route path="/passenger/help" element={
                  <ProtectedRoute requiredRole="passenger">
                    <Help />
                  </ProtectedRoute>
                } />
                <Route path="/passenger/saved-cards" element={
                  <ProtectedRoute requiredRole="passenger">
                    <SavedCards />
                  </ProtectedRoute>
                } />
                
                {/* Pilot routes */}
                <Route path="/pilot" element={
                  <ProtectedRoute requiredRole="pilot">
                    <PilotDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/pilot/ride/:rideId" element={
                  <ProtectedRoute requiredRole="pilot">
                    <ActiveRide />
                  </ProtectedRoute>
                } />
                <Route path="/pilot/rate/:rideId" element={
                  <ProtectedRoute requiredRole="pilot">
                    <RatePassenger />
                  </ProtectedRoute>
                } />
                <Route path="/pilot/history" element={
                  <ProtectedRoute requiredRole="pilot">
                    <PilotHistory />
                  </ProtectedRoute>
                } />
                <Route path="/pilot/profile" element={
                  <ProtectedRoute requiredRole="pilot">
                    <PilotProfile />
                  </ProtectedRoute>
                } />
                <Route path="/pilot/profile/edit" element={
                  <ProtectedRoute requiredRole="pilot">
                    <PilotProfileEdit />
                  </ProtectedRoute>
                } />
                <Route path="/pilot/earnings" element={
                  <ProtectedRoute requiredRole="pilot">
                    <Earnings />
                  </ProtectedRoute>
                } />
                <Route path="/pilot/settings" element={
                  <ProtectedRoute requiredRole="pilot">
                    <PilotSettings />
                  </ProtectedRoute>
                } />
                <Route path="/pilot/documents" element={
                  <ProtectedRoute requiredRole="pilot">
                    <PilotDocumentUpload />
                  </ProtectedRoute>
                } />
                
                <Route path="/terms" element={<TermsOfUse />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />

                {/* Admin routes */}
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<AdminDashboard />} />
                  <Route path="users" element={<AdminUsers />} />
                  <Route path="pilots" element={<AdminPilotApproval />} />
                  <Route path="rides" element={<AdminRides />} />
                  <Route path="financial" element={<AdminFinancial />} />
                  <Route path="ads" element={<AdminAds />} />
                  <Route path="vouchers" element={<AdminVouchers />} />
                </Route>

                <Route path="/instalar" element={<InstallPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              </Suspense>
            </BrowserRouter>
            </ErrorBoundary>
          </TooltipProvider>
        </AppProvider>
      </SettingsInitializer>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
