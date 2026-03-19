import { Button } from "@/components/ui/button";
import Window from "@/components/v2/window/Window";
import FeatureCard from "@/components/v2/ui/molecules/cards/feature-card/FeatureCard";
import Navbar from "@/components/v2/ui/molecules/navbar/Navbar";
import { ArrowUpRight } from "@/components/v2/ui/atoms/Icons/Icons";
import Footbar from "@/pages/layout/Footbar";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/auth/use-auth-hook";
import { useEffect } from "react";

const Home = () => {
  const { isAuthenticated, login, getToken } = useAuth();

  useEffect(() => {
    getToken();
  }, [getToken]);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden font-sans">
      <div
        className="fixed inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage: `radial-gradient(ellipse 70% 50% at 80% 0%, oklch(0.55 0.18 45 / 0.06), transparent 50%)`,
        }}
      />
      <Navbar />
      <main className="relative flex flex-col p-8 md:p-12 items-left space-y-12 justify-center text-left max-w-5xl mx-auto">
        <div className="space-y-4 animate-reveal">
          <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight text-foreground">
            Buddhist AI Annotation Tool
          </h1>
          <p className="text-muted-foreground max-w-2xl leading-relaxed">
            An advanced platform for annotating and reviewing Tibetan texts with parallel text editing and comprehensive annotation tools.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-start gap-3 flex-wrap animate-reveal animate-reveal-delay-1">
          <Button
            variant="default"
            size="lg"
            className="cursor-pointer font-medium"
            onClick={() => login(true)}
          >
            Start Annotating
          </Button>
          <Button variant="outline" size="lg" onClick={() => login(false)} asChild>
            <span>Login</span>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <a
              href="https://buddhistai.tools"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground"
            >
              buddhistai.tools
            </a>
          </Button>
          <Button variant="outline" size="lg" className="group" asChild>
            <Link to="/help" className="text-muted-foreground hover:text-foreground flex items-center gap-2">
              View Walkthrough
              <span className="relative overflow-hidden h-fit w-fit inline-flex">
                <ArrowUpRight className="group-hover:-translate-y-5 group-hover:translate-x-5 duration-500 transition-transform" />
                <ArrowUpRight className="absolute top-0 group-hover:translate-x-0 duration-500 group-hover:translate-y-0 transition-all translate-y-5 -translate-x-5" />
              </span>
            </Link>
          </Button>
        </div>
        <div className="animate-reveal animate-reveal-delay-2">
          <Window />
        </div>
        <div id="features" className="animate-reveal animate-reveal-delay-3">
          <FeatureCard />
        </div>
      </main>
      <Footbar />
    </div>
  );
};

export default Home;
