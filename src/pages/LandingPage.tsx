import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Eye, Shield, Calendar, Scan, ChevronRight, Zap, Lock, BarChart3 } from "lucide-react";
import heroImage from "@/assets/hero-workshop.jpg";

const features = [
  {
    icon: Eye,
    title: "360° Immersive Exploration",
    description: "Navigate workshops in full panoramic view with interactive hotspots on every machine.",
  },
  {
    icon: Shield,
    title: "Safety & Compliance",
    description: "Digital SOP checklists and undertaking forms ensure safety before any machine booking.",
  },
  {
    icon: Calendar,
    title: "Smart Booking System",
    description: "Real-time availability, conflict-free scheduling, and automated approval workflows.",
  },
  {
    icon: Scan,
    title: "QR Code Entry",
    description: "Scan at the workshop entrance to instantly enter the immersive digital twin environment.",
  },
  {
    icon: Zap,
    title: "Real-Time Status",
    description: "Live machine availability with instant updates — no page refresh needed.",
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    description: "Usage insights, booking heatmaps, and performance metrics for administrators.",
  },
];

const steps = [
  { step: "01", title: "Scan QR Code", description: "Scan the workshop entrance QR to begin your immersive journey." },
  { step: "02", title: "Explore in 360°", description: "Navigate the digital twin, interact with machine hotspots." },
  { step: "03", title: "Complete Safety", description: "Acknowledge SOP checklist and digital undertaking form." },
  { step: "04", title: "Book & Build", description: "Reserve your time slot and start building your project." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt="Immersive workshop environment"
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background" />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-secondary/5" />
        </div>

        <div className="relative container pt-24 pb-16 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-panel text-xs text-muted-foreground mb-8 fade-in">
            <Lock className="h-3 w-3 text-accent" />
            Institution-Grade Platform
            <ChevronRight className="h-3 w-3" />
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-7xl font-black tracking-tight mb-6 fade-in max-w-4xl mx-auto leading-[1.1]">
            Your Workshop,{" "}
            <span className="gradient-text">Reimagined</span>{" "}
            in 360°
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 fade-in">
            Explore machines, complete safety protocols, and book equipment — all from an immersive digital twin of your college workshop.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 fade-in">
            <Button variant="hero" size="xl" asChild>
              <Link to="/workshop">
                Explore Demo
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button variant="glass" size="lg" asChild>
              <Link to="/auth?tab=register">Create Account</Link>
            </Button>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-3 gap-6 max-w-lg mx-auto fade-in">
            {[
              { value: "360°", label: "Immersive View" },
              { value: "Real-Time", label: "Machine Status" },
              { value: "100%", label: "Safety Compliant" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl font-bold gradient-text">{stat.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.02] to-transparent" />
        <div className="container relative">
          <div className="text-center mb-16">
            <p className="text-sm font-medium text-accent mb-2">Features</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything You Need</h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              A complete platform for immersive workshop management, safety compliance, and smart booking.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group glass-panel rounded-xl p-6 hover:bg-card/70 transition-all duration-300 hover:glow-primary"
              >
                <div className="h-11 w-11 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-base font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24">
        <div className="container">
          <div className="text-center mb-16">
            <p className="text-sm font-medium text-secondary mb-2">How It Works</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Four Simple Steps</h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              From scanning a QR code to booking a machine — it's all seamless.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((s, i) => (
              <div key={s.step} className="relative group">
                <div className="glass-panel rounded-xl p-6 h-full hover:bg-card/70 transition-all">
                  <span className="text-4xl font-black gradient-text opacity-30 block mb-3">
                    {s.step}
                  </span>
                  <h3 className="text-base font-semibold mb-2">{s.title}</h3>
                  <p className="text-sm text-muted-foreground">{s.description}</p>
                </div>
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-3 text-muted-foreground/30">
                    <ChevronRight className="h-6 w-6" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="container">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/20 via-secondary/10 to-accent/10 border border-border/50 p-12 md:p-16 text-center">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
            <div className="relative">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Transform Your Workshop?</h2>
              <p className="text-muted-foreground max-w-lg mx-auto mb-8">
                Join colleges already using Digital Smart Workshop for safer, smarter machine access.
              </p>
              <Button variant="hero" size="xl" asChild>
                <Link to="/auth?tab=register">
                  Get Started Free
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
