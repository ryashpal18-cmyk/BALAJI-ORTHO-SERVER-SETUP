import { LayoutDashboard, Calendar, Receipt, Bone, MoreHorizontal } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSidebar } from "@/components/ui/sidebar";
import { getCurrentRole, getCurrentPerms } from "@/lib/appConfig";

const ITEMS = [
  { label: "Home",    url: "/dashboard",    icon: LayoutDashboard },
  { label: "Appts",   url: "/appointments", icon: Calendar },
  { label: "Billing", url: "/billing",      icon: Receipt },
  { label: "Ortho",   url: "/ortho",        icon: Bone },
];

/** Phone-only bottom bar: main pages one tap away, "More" opens the full menu. */
export function MobileBottomNav() {
  const { isMobile, openMobile, setOpenMobile } = useSidebar();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  if (!isMobile) return null;
  const isAdmin = getCurrentRole() === "admin";
  const perms = getCurrentPerms();
  const items = ITEMS.filter(i => isAdmin || perms.includes(i.url));
  const tab = (key: string, label: string, Icon: any, active: boolean, onClick: () => void) => (
    <button key={key} type="button" onClick={onClick} aria-label={label} aria-current={active ? "page" : undefined}
      style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3,
        minHeight: 60, background: "none", border: "none", cursor: "pointer",
        color: active ? "#ffffff" : "rgba(255,255,255,0.60)", fontSize: 12, fontWeight: active ? 700 : 500 }}>
      <Icon style={{ width: 22, height: 22 }} />
      <span>{label}</span>
    </button>
  );
  return (
    <nav className="no-print" aria-label="Main navigation"
      style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 40, display: "flex",
        paddingBottom: "env(safe-area-inset-bottom)",
        background: "linear-gradient(135deg, #0d2351 0%, #16418a 60%, #0e5e3b 100%)",
        borderTop: "1px solid rgba(255,255,255,0.14)", boxShadow: "0 -4px 20px rgba(13,35,81,0.25)" }}>
      {items.map(i => tab(i.url, i.label, i.icon, !openMobile && (pathname === i.url || pathname.startsWith(i.url + "/")),
        () => { setOpenMobile(false); navigate(i.url); }))}
      {tab("more", "More", MoreHorizontal, openMobile, () => setOpenMobile(!openMobile))}
    </nav>
  );
}
