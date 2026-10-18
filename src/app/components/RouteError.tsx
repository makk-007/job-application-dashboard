import { useEffect } from "react";
import { Link, isRouteErrorResponse, useRouteError } from "react-router";
import { AlertTriangle, FileQuestion } from "lucide-react";

/**
 * Shown by React Router when a route fails to render or the URL matches no
 * route. Placed as the `errorElement` of the top-level routes, and of a
 * pathless route wrapping the app pages so the sidebar stays visible when
 * only the page content fails.
 */
export function RouteError() {
  const error = useRouteError();

  useEffect(() => {
    console.error("Route error:", error);
  }, [error]);

  const isNotFound = isRouteErrorResponse(error) && error.status === 404;
  const Icon = isNotFound ? FileQuestion : AlertTriangle;
  const title = isNotFound ? "Page not found" : "Something went wrong";
  const description = isNotFound
    ? "The page you are looking for does not exist or has moved."
    : "This page ran into an unexpected problem. Any unsaved changes on it may be lost.";
  const message =
    import.meta.env.DEV && error instanceof Error ? error.message : "";

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div
        role="alert"
        className="bg-card rounded-xl border shadow-sm p-8 max-w-md w-full text-center"
      >
        <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
          <Icon className="size-6 text-destructive" aria-hidden="true" />
        </div>
        <h1 className="text-lg font-semibold text-foreground mb-2">{title}</h1>
        <p className="text-sm text-muted-foreground mb-6">{description}</p>
        {message && (
          <p className="text-xs text-muted-foreground font-mono bg-muted rounded-md px-3 py-2 mb-6 text-left break-all">
            {message}
          </p>
        )}
        <div className="flex gap-3 justify-center">
          {!isNotFound && (
            <button
              onClick={() => window.location.reload()}
              className="px-4 h-9 border border-border rounded-md text-sm font-medium text-foreground hover:bg-accent transition-colors"
            >
              Reload page
            </button>
          )}
          <Link
            to="/"
            className="inline-flex items-center px-4 h-9 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
