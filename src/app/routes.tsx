import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { DashboardOverview } from "./pages/DashboardOverview";
import { Applications } from "./pages/Applications";
import { Pipeline } from "./pages/Pipeline";
import { Contacts } from "./pages/Contacts";
import { Interviews } from "./pages/Interviews";
import { Offers } from "./pages/Offers";
import { Documents } from "./pages/Documents";
import { Settings } from "./pages/Settings";
import { Auth } from "./pages/Auth";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <Auth defaultMode="login" />,
  },
  {
    path: "/signup",
    element: <Auth defaultMode="signup" />,
  },
  {
    path: "/",
    Component: Layout,
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
]);
