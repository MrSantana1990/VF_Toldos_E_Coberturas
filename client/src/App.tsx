import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import Home from "@/pages/Home";
import Quote from "@/pages/Quote";
import Admin from "@/pages/Admin";
import AdminQuotes from "@/pages/admin/Quotes";
import AdminAppointments from "@/pages/admin/Appointments";
import AdminFinances from "@/pages/admin/Finances";
import DashboardLayout from "@/components/DashboardLayout";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

function AdminQuotesRoute() {
  return (
    <DashboardLayout>
      <AdminQuotes />
    </DashboardLayout>
  );
}

function AdminAppointmentsRoute() {
  return (
    <DashboardLayout>
      <AdminAppointments />
    </DashboardLayout>
  );
}

function AdminFinancesRoute() {
  return (
    <DashboardLayout>
      <AdminFinances />
    </DashboardLayout>
  );
}

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/quote" component={Quote} />
      <Route path="/admin" component={Admin} />
      <Route path="/admin/quotes" component={AdminQuotesRoute} />
      <Route path="/admin/appointments" component={AdminAppointmentsRoute} />
      <Route path="/admin/finances" component={AdminFinancesRoute} />
      <Route path="/404" component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
