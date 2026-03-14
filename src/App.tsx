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
import { useEffect } from "react";
import { isNativeMobile, platform } from "./capacitor";
import Landing from "./pages/Landing";
import PassengerAuth from "./pages/auth/PassengerAuth";
import PilotAuth from "./pages/auth/PilotAuth";
import AuthCallback from "./pages/auth/AuthCallback";
import PassengerHome from "./pages/passenger/PassengerHome";
import RequestRide from "./pages/passenger/RequestRide";
import SearchingPilot from "./pages/passenger/SearchingPilot";
import Tracking from "./pages/passenger/Tracking";
import InRide from "./pages/passenger/InRide";
import Completed from "./pages/passenger/Completed";
import RideHistory from "./pages/passenger/RideHistory";
import Profile from "./pages/passenger/Profile";
import Payment from "./pages/passenger/Payment";
import WalletPage from "./pages/passenger/Wallet";
import Favorites from "./pages/passenger/Favorites";
import Settings from "./pages/passenger/Settings";
import Referral from "./pages/passenger/Referral";
import Help from "./pages/passenger/Help";
import SavedCards from "./pages/passenger/SavedCards";
import PilotDashboard from "./pages/pilot/PilotDashboard";
import ActiveRide from "./pages/pilot/ActiveRide";
import RatePassenger from "./pages/pilot/RatePassenger";
import PilotHistory from "./pages/pilot/PilotHistory";
import PilotProfile from "./pages/pilot/PilotProfile";
import PilotProfileEdit from "./pages/pilot/PilotProfileEdit";
import Earnings from "./pages/pilot/Earnings";
import PilotSettings from "./pages/pilot/PilotSettings";
import TermsOfUse from "./pages/TermsOfUse";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Handles Android hardware back button via Capacitor App plugin
function AndroidBackHandler() {
  const navigate = useNavigate();
  useEffect(() => {
    if (!isNativeMobile || platform !== 'android') return;
    let cleanup: (() => void) | undefined;
    import('@capacitor/app').then(({ App: CapApp }) => {
      const handler = CapApp.addListener('backButton', ({ canGoBack }) => {
        if (canGoBack) {
          navigate(-1);
        } else {
          CapApp.exitApp();
        }
      });
      cleanup = () => { handler.then(h => h.remove()); };
    });
    return () => { cleanup?.(); };
  }, [navigate]);
  return null;
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
              <Sonner />
              <Routes>
                <Route path="/" element={<Landing />} />
                
                {/* Auth routes */}
                <Route path="/auth/passenger" element={<PassengerAuth />} />
                <Route path="/auth/pilot" element={<PilotAuth />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                
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
                
                <Route path="/terms" element={<TermsOfUse />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
            </ErrorBoundary>
          </TooltipProvider>
        </AppProvider>
      </SettingsInitializer>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
