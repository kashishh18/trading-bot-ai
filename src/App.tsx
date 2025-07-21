import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
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
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="predictions" element={<Predictions />} />
            <Route path="portfolio" element={<div className="p-6"><h1 className="text-2xl font-bold">Portfolio - Coming Soon</h1></div>} />
            <Route path="opportunities" element={<div className="p-6"><h1 className="text-2xl font-bold">Opportunities - Coming Soon</h1></div>} />
            <Route path="history" element={<div className="p-6"><h1 className="text-2xl font-bold">Trading History - Coming Soon</h1></div>} />
            <Route path="analytics" element={<div className="p-6"><h1 className="text-2xl font-bold">Analytics - Coming Soon</h1></div>} />
            <Route path="scanner" element={<div className="p-6"><h1 className="text-2xl font-bold">Stock Scanner - Coming Soon</h1></div>} />
            <Route path="settings" element={<div className="p-6"><h1 className="text-2xl font-bold">Settings - Coming Soon</h1></div>} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
