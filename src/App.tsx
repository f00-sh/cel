import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AssessmentPage } from "@/pages/Assessment";
import { MethodologyPage } from "@/pages/Methodology";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AssessmentPage />} />
        <Route path="/methodology" element={<MethodologyPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
