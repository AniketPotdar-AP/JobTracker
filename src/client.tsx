import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "./router";
import "./styles.css";

const rootElement = document.getElementById("app");
if (rootElement) {
  const router = getRouter();
  createRoot(rootElement).render(<RouterProvider router={router} />);
}
