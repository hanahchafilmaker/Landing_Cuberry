import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import AdminPage from "@/pages/AdminPage";
import { Redirect, Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import DashboardLayout from "./components/DashboardLayout";
import { ThemeProvider } from "./contexts/ThemeContext";

function AdminShell() {
  return (
    <DashboardLayout>
      <AdminPage />
    </DashboardLayout>
  );
}

const ADMIN_PATHS = ["/admin", "/admin/portfolio", "/admin/services", "/admin/faqs", "/admin/team", "/admin/inquiries", "/admin/settings"];

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Switch>
            <Route path="/">
              <Redirect to="/admin" />
            </Route>
            {ADMIN_PATHS.map((path) => (
              <Route key={path} path={path} component={AdminShell} />
            ))}
            <Route path="/404" component={NotFound} />
            <Route component={NotFound} />
          </Switch>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
