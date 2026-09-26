import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import AdminPage from "@/pages/AdminPage";
import Home from "@/pages/Home";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import DashboardLayout from "./components/DashboardLayout";
import { ThemeProvider } from "./contexts/ThemeContext";

function AdminShell() {
  return <DashboardLayout><AdminPage /></DashboardLayout>;
}

function Router() {
  return <Switch>
    <Route path="/" component={Home} />
    <Route path="/admin" component={AdminShell} />
    <Route path="/admin/portfolio" component={AdminShell} />
    <Route path="/admin/services" component={AdminShell} />
    <Route path="/admin/faqs" component={AdminShell} />
    <Route path="/admin/inquiries" component={AdminShell} />
    <Route path="/admin/settings" component={AdminShell} />
    <Route path="/404" component={NotFound} />
    <Route component={NotFound} />
  </Switch>;
}

function App() {
  return <ErrorBoundary>
    <ThemeProvider defaultTheme="light">
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </ThemeProvider>
  </ErrorBoundary>;
}

export default App;
