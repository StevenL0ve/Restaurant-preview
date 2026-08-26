import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./state/auth";
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

  if (!ready) return null;
  if (!user) return <Login />;

  return (
    <div className="app">
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
