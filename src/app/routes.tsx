import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { RouteError } from "./components/RouteError";
import { DashboardOverview } from "./pages/DashboardOverview";
import { Applications } from "./pages/Applications";
import { Pipeline } from "./pages/Pipeline";
import { Contacts } from "./pages/Contacts";
import { Interviews } from "./pages/Interviews";
import { Offers } from "./pages/Offers";
import { Documents } from "./pages/Documents";
import { Settings } from "./pages/Settings";
import { Auth } from "./pages/Auth";

const errorElement = <RouteError />;

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <Auth defaultMode="login" />,
    errorElement,
  },
  {
    path: "/signup",
    element: <Auth defaultMode="signup" />,
    errorElement,
  },
  {
    path: "/",
    Component: Layout,
    errorElement,
    children: [
      {
        // Pathless route: page errors render inside the Layout (sidebar stays).
        errorElement,
        children: [
          { index: true, Component: DashboardOverview },
          { path: "applications", Component: Applications },
          { path: "pipeline", Component: Pipeline },
          { path: "contacts", Component: Contacts },
          { path: "interviews", Component: Interviews },
          { path: "offers", Component: Offers },
          { path: "documents", Component: Documents },
          { path: "settings", Component: Settings },
        ],
      },
    ],
  },
]);
