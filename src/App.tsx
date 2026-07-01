import { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./state/auth";
import { Login } from "./pages/Login";
import { Welcome } from "./pages/Welcome";
import { Sidebar } from "./components/Sidebar";
import { BottomNav } from "./components/BottomNav";
import { TopBar } from "./components/TopBar";
import { Dashboard } from "./pages/Dashboard";
import { Messages } from "./pages/Messages";
import { Calendar } from "./pages/Calendar";
import { Expenses } from "./pages/Expenses";
import { Journal } from "./pages/Journal";
import { InfoBank } from "./pages/InfoBank";
import { Packing } from "./pages/Packing";
import { Paywall } from "./pages/Paywall";
import { Assistant } from "./pages/Assistant";
import { SearchPage } from "./pages/SearchPage";
import { Settings } from "./pages/Settings";

export default function App() {
  const { user, ready } = useAuth();
  const [, bump] = useState(0);

  // Wait for the session check, then gate the app behind sign-in.
  if (!ready) return null;
  if (!user) return <Login />;

  // Brand-new accounts run the one-time family setup wizard.
  if (localStorage.getItem("coparent.needsSetup") === "1") {
    return (
      <Welcome
        onDone={() => {
          localStorage.removeItem("coparent.needsSetup");
          bump((n) => n + 1);
        }}
      />
    );
  }

  return (
    <div className="app">
      <a href="#main-content" className="skip-link">Skip to content</a>
      <Sidebar />
      <div className="main">
        <TopBar />
        <main id="main-content" className="content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/journal" element={<Journal />} />
            <Route path="/info" element={<InfoBank />} />
            <Route path="/packing" element={<Packing />} />
            <Route path="/upgrade" element={<Paywall />} />
            <Route path="/assistant" element={<Assistant />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
