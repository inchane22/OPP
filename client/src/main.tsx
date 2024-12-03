import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Switch, Route, useLocation, Redirect } from "wouter";
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
import BusinessesPage from "./pages/BusinessesPage";
import AccountPage from "./pages/AccountPage";
import AdminPanel from "./pages/AdminPanel";
import { Loader2 } from "lucide-react";
import { useUser } from "./hooks/use-user";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { cn } from "./lib/utils";

function ProtectedRoute({ component: Component, ...rest }: { component: React.ComponentType<any> }) {
  const { user, isLoading } = useUser();
  const [location] = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to={`/login?redirect=${encodeURIComponent(location)}`} />;
  }

  return <Component {...rest} />;
}

function Router() {
  const { user, isLoading } = useUser();
  const [location] = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If user is logged in, redirect from login page
  if (user) {
    if (location === "/login") {
      // Redirect admins to admin panel, others to home
      return <Redirect to={user.role === 'admin' ? "/admin" : "/"} />;
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} />
      <div className="flex flex-col min-h-screen">
        <main className={cn(
          "container mx-auto px-4 py-8 flex-1",
          "animate-in fade-in-50 duration-500"
        )}>
          <Switch>
            <Route path="/" component={HomePage} />
            <Route path="/login" component={AuthPage} />
            
            {/* English routes */}
            <Route path="/forum" component={ForumPage} />
            <Route path="/events" component={EventsPage} />
            <Route path="/resources" component={ResourcesPage} />
            <Route path="/businesses" component={BusinessesPage} />
            <Route path="/account">
              <ProtectedRoute component={AccountPage} />
            </Route>
            
            {/* Spanish routes */}
            <Route path="/foro">
              <Redirect to="/forum" />
            </Route>
            <Route path="/eventos">
              <Redirect to="/events" />
            </Route>
            <Route path="/recursos">
              <Redirect to="/resources" />
            </Route>
            <Route path="/negocios">
              <Redirect to="/businesses" />
            </Route>
            <Route path="/cuenta">
              <Redirect to="/account" />
            </Route>

            <Route path="/admin">
              {user?.role === 'admin' ? <AdminPanel /> : <Redirect to="/" />}
            </Route>

            <Route>
              <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
                <h1 className="text-4xl font-bold">404</h1>
                <p className="text-muted-foreground">Page not found / Página no encontrada</p>
              </div>
            </Route>
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
