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

  // Redirect from login/register if already authenticated
  if (user && location === "/login") {
    return <Redirect to="/" />;
  }

  // Only redirect to admin panel if user is admin and trying to access non-admin routes
  if (user?.role === 'admin' && !location.startsWith('/admin') && location !== '/') {
    return <Redirect to="/admin" />;
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
            <Route path="/businesses" component={BusinessesPage} />
            <Route path="/admin">
              {user?.role === 'admin' ? <AdminPanel /> : <Redirect to="/" />}
            </Route>
            <Route path="/account">
              <ProtectedRoute component={AccountPage} />
            </Route>
            <Route>
              <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
                <h1 className="text-4xl font-bold">404</h1>
                <p className="text-muted-foreground">Página no encontrada</p>
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
