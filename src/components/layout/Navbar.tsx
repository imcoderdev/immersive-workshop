import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Menu, X, LogOut, LayoutDashboard, User } from "lucide-react";
import { useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import logoImg from "@/assets/logo.png";

const publicLinks = [
  { label: "Features", href: "/#features" },
  { label: "How It Works", href: "/#how-it-works" },
  { label: "Explore Demo", href: "/workshop" },
];

function getDashboardPath(role?: string) {
  if (role === 'admin') return '/admin';
  if (role === 'faculty') return '/faculty';
  return '/dashboard';
}

export function Navbar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuthStore();
  const isImmersive = location.pathname.startsWith("/workshop");
  const isAuthenticated = !!user;

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const authLinks = isAuthenticated
    ? [
        { label: "Workshop", href: "/workshop" },
        { label: "Dashboard", href: getDashboardPath(profile?.role) },
      ]
    : publicLinks;

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isImmersive
          ? "glass-panel-strong border-b-0"
          : "glass-panel-strong border-b border-border/50"
      )}
    >
      <nav className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <img src={logoImg} alt="SmartWorkshop 360" className="h-9 w-auto" />
          <span className="text-lg font-bold tracking-tight">
            <span className="gradient-text">Smart</span>{" "}
            <span className="text-foreground">Workshop</span>
          </span>
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-1">
          {authLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted/50"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <span className="text-xs text-muted-foreground capitalize">{profile?.role ?? 'user'}</span>
              <span className="text-sm font-medium truncate max-w-[120px]">{profile?.full_name ?? user?.email}</span>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-1" />Sign Out
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/auth">Sign In</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/auth?tab=register">Get Started</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile */}
        <button
          className="md:hidden p-2 text-muted-foreground hover:text-foreground"
          onClick={() => setOpen(!open)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden glass-panel-strong border-t border-border/30 fade-in">
          <div className="container py-4 flex flex-col gap-2">
            {authLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                onClick={() => setOpen(false)}
                className="px-4 py-3 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50"
              >
                {link.label}
              </Link>
            ))}
            <div className="flex gap-2 pt-2">
              {isAuthenticated ? (
                <Button variant="ghost" size="sm" className="flex-1" onClick={() => { setOpen(false); handleSignOut(); }}>
                  <LogOut className="h-4 w-4 mr-1" />Sign Out
                </Button>
              ) : (
                <>
                  <Button variant="ghost" size="sm" className="flex-1" asChild>
                    <Link to="/auth" onClick={() => setOpen(false)}>Sign In</Link>
                  </Button>
                  <Button size="sm" className="flex-1" asChild>
                    <Link to="/auth?tab=register" onClick={() => setOpen(false)}>Get Started</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
