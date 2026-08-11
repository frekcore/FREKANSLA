import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { FrekProvider } from "@/store/FrekContext";
import { Toaster } from "@/components/ui/sonner";
import TopNav from "@/components/TopNav";
import CreativeEngine from "@/pages/CreativeEngine";
import CertificationPortal from "@/pages/CertificationPortal";

function App() {
  return (
    <div className="App min-h-screen bg-[#0A0A0A] grain">
      <FrekProvider>
        <BrowserRouter>
          <TopNav />
          <Routes>
            <Route path="/" element={<CreativeEngine />} />
            <Route path="/certify" element={<CertificationPortal />} />
          </Routes>
        </BrowserRouter>
        <Toaster position="bottom-right" theme="dark" />
      </FrekProvider>
    </div>
  );
}

export default App;
