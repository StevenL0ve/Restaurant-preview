import { useEffect, useRef, useState } from "react";
import type React from "react";
import { Routes, Route, Navigate, useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "./state/auth";
import { useStore } from "./state/store";
import { initNativeFileOpen } from "./lib/nativeFileOpen";
import { Login } from "./pages/Login";
import { AppLock } from "./components/AppLock";
import { Onboarding } from "./components/Onboarding";
import { useProfile } from "./lib/profile";
import { cloudEnabled } from "./lib/cloud";
import { Sidebar } from "./components/Sidebar";
import { BottomNav } from "./components/BottomNav";
import { TopBar } from "./components/TopBar";
import { Welcome } from "./components/Welcome";
import { Dashboard } from "./pages/Dashboard";
import { TodayPage } from "./pages/TodayPage";
import { ScheduleUploadPage } from "./pages/ScheduleUploadPage";
import { ItemCleanupPage } from "./pages/ItemCleanupPage";
import { CardsPage } from "./pages/CardsPage";
import { CardDetail } from "./pages/CardDetail";
import { CardEdit } from "./pages/CardEdit";
import { CardScan } from "./pages/CardScan";
import { TemplatesPage } from "./pages/TemplatesPage";
import { CombineCardsPage } from "./pages/CombineCardsPage";
import { SetupMode } from "./pages/SetupMode";
import { SurgeonsPage } from "./pages/SurgeonsPage";
import { SurgeonDetail } from "./pages/SurgeonDetail";
import { FacilitiesPage } from "./pages/FacilitiesPage";
import { LoanersPage } from "./pages/LoanersPage";
import { RepStoragePage } from "./pages/RepStoragePage";
import { CartsPage } from "./pages/CartsPage";
import { CartPullPage } from "./pages/CartPullPage";
import { MissingDayPage } from "./pages/MissingDayPage";
import { SendPullPage } from "./pages/SendPullPage";
import { OnCallPage } from "./pages/OnCallPage";
import { OnCallPeoplePage } from "./pages/OnCallPeoplePage";
import { SearchPage } from "./pages/SearchPage";
import { CaseLogPage } from "./pages/CaseLogPage";
import { CallSchedulePage } from "./pages/CallSchedulePage";
import { CatalogPage } from "./pages/CatalogPage";
import { Settings } from "./pages/Settings";
import { Paywall } from "./pages/Paywall";
import { SpdPage } from "./pages/SpdPage";
import { ItemPage } from "./pages/ItemPage";
import { FacilityRequired, DemoBanner } from "./pages/FacilityRequired";
import { useFacilityAccess } from "./lib/facilityGate";
import { usePendingRequests } from "./lib/approvals";
import { refreshFacilities } from "./state/cloudSync";
import { JoinLinkPage } from "./pages/JoinLinkPage";
import { initIap } from "./lib/iap";


// Facility-only screens: with a facility they're the real thing; in demo
// they run on the device's sample data behind a banner; otherwise the gate
// page explains and offers the facility login.
function Gated({ children }: { children: React.ReactNode }) {
  const access = useFacilityAccess();
  const { pathname } = useLocation();
  if (access.joined && access.rep && !pathname.startsWith("/loaners")) {
    return (
      <div className="page gate">
        <div className="card gate-card">
          <h2>Rep link</h2>
          <p className="muted">
            Your account is linked to this facility as a vendor rep, for set requests only. Your
            requests, their status, and check-in live on the Loaners tab.
          </p>
          <Link className="btn btn-primary" to="/loaners">Open my set requests</Link>
        </div>
      </div>
    );
  }
  if (access.joined) return <>{children}</>;
  if (access.demo) return <><DemoBanner />{children}</>;
  return <FacilityRequired />;
}

export default function App() {
  const { user, ready } = useAuth();
  const profile = useProfile(user?.uid);
  const { importCards } = useStore();
  const navigate = useNavigate();
  const [banner, setBanner] = useState<string | null>(null);
  const importRef = useRef(importCards);
  importRef.current = importCards;

  // A tapped .orsync file (Messages, Mail, AirDrop) imports itself: merge the
  // card, create any pull-request carts, land the user on the right screen.
  useEffect(() => {
    initNativeFileOpen((json) => {
      try {
        const { added, skipped, carts, loaners, loanerOutcome } = importRef.current(json);
        if (loaners) {
          setBanner(loanerOutcome === "merged" ? "Loaner update received: sets and statuses refreshed." : "Loaner request imported.");
          navigate("/loaners");
          setTimeout(() => setBanner(null), 4500);
          return;
        }
        const bits = [
          added ? `Imported ${added} card${added === 1 ? "" : "s"}` : "Card already in your library",
          carts ? `set up ${carts} cart${carts === 1 ? "" : "s"}` : "",
          skipped && added ? `(${skipped} you already had)` : "",
        ].filter(Boolean);
        setBanner(`${bits.join(", ")}.`);
        navigate(carts ? "/carts" : "/cards");
      } catch {
        setBanner("That file didn’t look like an ORSync card file.");
      }
      setTimeout(() => setBanner(null), 4500);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Asked to join a facility? Find out whether an admin decided, on open
  // and whenever the app comes back to the front.
  useEffect(() => {
    if (!cloudEnabled() || !user?.uid) return;
    const run = () => { void refreshFacilities(user.uid!); };
    run();
    const onVis = () => { if (document.visibilityState === "visible") run(); };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [user?.uid]);

  // Individual Pro (App Store / Google Play): refresh the entitlement at launch.
  useEffect(() => { if (user?.uid) void initIap(user.uid).catch(() => undefined); }, [user?.uid]);

  // Admins: a toast when someone new asks to join.
  const pending = usePendingRequests();
  const seenPending = useRef<Set<string> | null>(null);
  useEffect(() => {
    const ids = new Set(pending.map((m) => m.uid));
    if (seenPending.current) {
      const fresh = pending.filter((m) => !seenPending.current!.has(m.uid));
      if (fresh.length) {
        setBanner(fresh.length === 1
          ? `${fresh[0].name}${fresh[0].position ? ` (${fresh[0].position})` : ""} asked to join your facility. Approve in Settings.`
          : `${fresh.length} people asked to join your facility. Approve in Settings.`);
        setTimeout(() => setBanner(null), 7000);
      }
    }
    seenPending.current = ids;
  }, [pending]);

  if (!ready) return null;
  if (!user) return <Login />;
  // Right after creating an account (once per device): who you are, join
  // your hospital. Guests skip it; nothing here applies to a local-only library.
  if (cloudEnabled() && user.uid && !profile?.completedAt) return <Onboarding />;

  return (
    <div className="app">
      <AppLock />
      {banner && <div className="toast">{banner}</div>}
      <a href="#main-content" className="skip-link">Skip to content</a>
      <Welcome />
      <Sidebar />
      <div className="main">
        <TopBar />
        <main id="main-content" className="content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/today" element={<TodayPage />} />
            <Route path="/today/upload" element={<ScheduleUploadPage />} />
            <Route path="/case-log" element={<CaseLogPage />} />
            <Route path="/cards" element={<CardsPage />} />
            <Route path="/cards/new" element={<CardEdit />} />
            <Route path="/cards/scan" element={<CardScan />} />
            <Route path="/cards/cleanup" element={<ItemCleanupPage />} />
            <Route path="/catalog" element={<Gated><CatalogPage /></Gated>} />
            <Route path="/cards/templates" element={<TemplatesPage />} />
            <Route path="/cards/combine" element={<CombineCardsPage />} />
            <Route path="/cards/:id" element={<CardDetail />} />
            <Route path="/cards/:id/edit" element={<CardEdit />} />
            <Route path="/cards/:id/setup" element={<SetupMode />} />
            <Route path="/surgeons" element={<SurgeonsPage />} />
            <Route path="/surgeons/:id" element={<SurgeonDetail />} />
            <Route path="/facilities" element={<FacilitiesPage />} />
            <Route path="/loaners" element={<Gated><LoanersPage /></Gated>} />
            <Route path="/loaners/storage" element={<Gated><RepStoragePage /></Gated>} />
            <Route path="/carts" element={<Gated><CartsPage /></Gated>} />
            <Route path="/carts/missing" element={<Gated><MissingDayPage /></Gated>} />
            <Route path="/carts/send" element={<Gated><SendPullPage /></Gated>} />
            <Route path="/carts/:id" element={<Gated><CartPullPage /></Gated>} />
            <Route path="/on-call" element={<Gated><OnCallPage /></Gated>} />
            <Route path="/on-call/people" element={<Gated><OnCallPeoplePage /></Gated>} />
            <Route path="/on-call/schedule" element={<Gated><CallSchedulePage /></Gated>} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/spd" element={<Gated><SpdPage /></Gated>} />
            <Route path="/item" element={<ItemPage />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/join" element={<JoinLinkPage />} />
            <Route path="/upgrade" element={<Paywall />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
