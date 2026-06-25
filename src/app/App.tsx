import { RouterProvider } from "react-router";
import { router } from "./routes";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { RoundProvider } from "./context/RoundContext";
import { UndoableDeleteProvider } from "./context/UndoableDeleteContext";
import { Toaster } from "./components/ui/sonner";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { NotificationScheduler } from "./components/NotificationScheduler";

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <RoundProvider>
            <UndoableDeleteProvider>
              <NotificationScheduler />
              <RouterProvider router={router} />
              <Toaster richColors closeButton />
            </UndoableDeleteProvider>
          </RoundProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
