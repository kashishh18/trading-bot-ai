import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Predictions from "./pages/Predictions";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Predictions />} />
          <Route path="/predictions" element={<Predictions />} />
          <Route path="/opportunities" element={<Predictions />} />
          <Route path="/portfolio" element={<Predictions />} />
          <Route path="/history" element={<Predictions />} />
          <Route path="/analytics" element={<Predictions />} />
          <Route path="/scanner" element={<Predictions />} />
          <Route path="/settings" element={<Predictions />} />
          <Route path="*" element={<Predictions />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
