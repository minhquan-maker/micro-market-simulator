import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LondonClockProvider } from "./contexts/LondonClockContext";
import LandingPage from "./pages/LandingPage";
import SimulationApp from "./pages/SimulationApp";

export default function App() {
  return (
    <LondonClockProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/simulate/:type" element={<SimulationApp />} />
          <Route path="/simulate" element={<Navigate to="/simulate/microstructure" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </LondonClockProvider>
  );
}
