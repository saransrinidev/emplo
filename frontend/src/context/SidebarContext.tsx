import { createContext, useContext, useState, type ReactNode } from "react";

interface SidebarState {
  collapsed: boolean;
  mobileOpen: boolean;
  toggleSidebar: () => void;
  openMobile: () => void;
  closeMobile: () => void;
}

const SidebarContext = createContext<SidebarState | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem("sidebar-collapsed") === "true";
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleSidebar = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebar-collapsed", String(next));
      return next;
    });
  };

  const openMobile = () => setMobileOpen(true);
  const closeMobile = () => setMobileOpen(false);

  return (
    <SidebarContext.Provider
      value={{ collapsed, mobileOpen, toggleSidebar, openMobile, closeMobile }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar(): SidebarState {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used within SidebarProvider");
  return ctx;
}
