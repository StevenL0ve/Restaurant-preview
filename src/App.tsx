import { useEffect, useRef, useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "./state/auth";
import { useStore } from "./state/store";
import { initNativeFileOpen } from "./lib/nativeFileOpen";
import { Login } from "./pages/Login";
import { Sidebar } from "./components/Sidebar";
import { BottomNav } from "./components/BottomNav";
import { TopBar } from "./components/TopBar";
import { Welcome } from "./components/Welcome";
import { Dashboard } from "./pages/Dashboard";
import { TodayPage } from "./pages/TodayPage";
import { CardsPage } from "./pages/CardsPage";
import { CardDetail } from "./pages/CardDetail";
import { CardEdit } from "./pages/CardEdit";
import { CardPrint } from "./pages/CardPrint";
import { CardScan } from "./pages/CardScan";
import { SetupMode } from "./pages/SetupMode";
import { SurgeonsPage } from "./pages/SurgeonsPage";
import { SurgeonDetail } from "./pages/SurgeonDetail";
import { FacilitiesPage } from "./pages/FacilitiesPage";
import { LoanersPage } from "./pages/LoanersPage";
import { CartsPage } from "./pages/CartsPage";
import { CartPullPage } from "./pages/CartPullPage";
import { MissingDayPage } from "./pages/MissingDayPage";
import { SendPullPage } from "./pages/SendPullPage";
import { OnCallPage } from "./pages/OnCallPage";
import { OnCallPeoplePage } from "./pages/OnCallPeoplePage";
import { SearchPage } from "./pages/SearchPage";
import { Settings } from "./pages/Settings";
import { Paywall } from "./pages/Paywall";

export default function App() {
  const { user, ready } = useAuth();
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
        const { added, skipped, carts } = importRef.current(json);
        const bits = [
          added ? `Imported ${added} card${added === 1 ? "" : "s"}` : "Card already in your library",
          carts ? `set up ${carts} cart${carts === 1 ? "" : "s"}` : "",
          skipped && added ? `(${skipped} you already had)` : "",
        ].filter(Boolean);
        setBanner(`✅ ${bits.join(", ")}.`);
        navigate(carts ? "/carts" : "/cards");
      } catch {
        setBanner("That file didn’t look like an ORSync card file.");
      }
      setTimeout(() => setBanner(null), 4500);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ready) return null;
  if (!user) return <Login />;

  return (
    <div className="app">
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
            <Route path="/cards" element={<CardsPage />} />
            <Route path="/cards/new" element={<CardEdit />} />
            <Route path="/cards/scan" element={<CardScan />} />
            <Route path="/cards/:id" element={<CardDetail />} />
            <Route path="/cards/:id/edit" element={<CardEdit />} />
            <Route path="/cards/:id/print" element={<CardPrint />} />
            <Route path="/cards/:id/setup" element={<SetupMode />} />
            <Route path="/surgeons" element={<SurgeonsPage />} />
            <Route path="/surgeons/:id" element={<SurgeonDetail />} />
            <Route path="/facilities" element={<FacilitiesPage />} />
            <Route path="/loaners" element={<LoanersPage />} />
            <Route path="/carts" element={<CartsPage />} />
            <Route path="/carts/missing" element={<MissingDayPage />} />
            <Route path="/carts/send" element={<SendPullPage />} />
            <Route path="/carts/:id" element={<CartPullPage />} />
            <Route path="/on-call" element={<OnCallPage />} />
            <Route path="/on-call/people" element={<OnCallPeoplePage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/upgrade" element={<Paywall />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
