"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const PAGE_TITLES: Record<string, string> = {
  "/": "Sign In",
  "/dashboard": "Dashboard",
  "/billing": "Billing",
  "/invoice-form": "Invoice Form",
  "/advance-booking": "Advance Booking",
  "/daybook": "Day Book",
  "/branches": "Branches",
  "/sales-person": "Sales Person",
  "/targets": "Targets",
  "/my-targets": "My Targets",
  "/inventory-transfer-dashboard": "Inventory Transfer",
  "/inventory-transfer-form": "New Inventory Transfer",
  "/ai-assistant": "AI Assistant",
};

export default function PageTitle() {
  const pathname = usePathname();

  useEffect(() => {
    const pageTitle = pathname.startsWith("/qr-upload/")
      ? "Upload Documents"
      : PAGE_TITLES[pathname] || "WareFlow";
    document.title = pageTitle === "WareFlow" ? pageTitle : `${pageTitle} | WareFlow`;
  }, [pathname]);

  return null;
}
