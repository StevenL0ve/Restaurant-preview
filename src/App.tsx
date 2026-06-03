import { Routes, Route, Navigate } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { Dashboard } from "./pages/Dashboard";
import { Messages } from "./pages/Messages";
import { Calendar } from "./pages/Calendar";
import { Expenses } from "./pages/Expenses";
import { Journal } from "./pages/Journal";
import { InfoBank } from "./pages/InfoBank";
import { SearchPage } from "./pages/SearchPage";
import { Settings } from "./pages/Settings";

export default function App() {
  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <TopBar />
        <main className="content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/journal" element={<Journal />} />
            <Route path="/info" element={<InfoBank />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
