import { Link } from "react-router-dom";
import logoImg from "@/assets/logo.png";

export function Footer() {
  return (
    <footer className="border-t border-border/50 bg-card/30">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <img src={logoImg} alt="SmartWorkshop 360" className="h-8 w-auto" />
            </Link>
            <p className="text-sm text-muted-foreground max-w-sm">
              Immersive 360° digital twin platform for college workshops. Explore machines, stay safe, and book with confidence.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-3">Platform</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/#features" className="hover:text-foreground transition-colors">Features</Link></li>
              <li><Link to="/#how-it-works" className="hover:text-foreground transition-colors">How It Works</Link></li>
              <li><Link to="/workshop" className="hover:text-foreground transition-colors">Demo</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-3">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link></li>
              <li><Link to="/contact" className="hover:text-foreground transition-colors">Contact</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-border/30 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} SmartWorkshop 360. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
