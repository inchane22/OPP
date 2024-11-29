import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Switch, Route } from "wouter";
import "./index.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { LanguageProvider } from "./hooks/use-language";

import HomePage from "./pages/HomePage";
import AuthPage from "./pages/AuthPage";
import ForumPage from "./pages/ForumPage";
import EventsPage from "./pages/EventsPage";
import ResourcesPage from "./pages/ResourcesPage";
import { Loader2 } from "lucide-react";
import { useUser } from "./hooks/use-user";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

function Router() {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} />
      <div className="flex flex-col min-h-screen">
        <main className="container mx-auto px-4 py-8 flex-1">
          <Switch>
            <Route path="/" component={HomePage} />
            <Route path="/login" component={AuthPage} />
            <Route path="/forum" component={ForumPage} />
            <Route path="/events" component={EventsPage} />
            <Route path="/resources" component={ResourcesPage} />
            <Route>404 Page Not Found</Route>
          </Switch>
        </main>
        <Footer />
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <Router />
        <Toaster />
      </LanguageProvider>
    </QueryClientProvider>
  </StrictMode>
);
