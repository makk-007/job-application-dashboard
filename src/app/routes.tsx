import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { DashboardOverview } from "./pages/DashboardOverview";
import { Applications } from "./pages/Applications";
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
      { path: "settings", Component: Settings },
    ],
  },
]);
