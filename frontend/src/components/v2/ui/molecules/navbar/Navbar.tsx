import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth0 } from "@auth0/auth0-react";

function Navbar() {
  const { loginWithRedirect, isAuthenticated } = useAuth0();

  return (
    <nav className="relative z-50 bg-card/80 dark:bg-card/90 backdrop-blur-md border-b border-border px-6 py-3 flex justify-between items-center">
      <div className="flex items-center gap-3">
        <Link
          to="/"
          className="flex items-center gap-2 font-display font-semibold text-foreground hover:text-primary transition-colors"
        >
          <img
            alt="Buddhist AI"
            src="/favicon-32x32.png"
            width={32}
            height={32}
            className="object-contain"
          />
          <span className="text-xl">Buddhist AI Annotation Tool</span>
        </Link>
      </div>
      <div className="flex items-center gap-3">
        <Button variant="ghost" asChild>
          <a
            href="https://buddhistai.tools"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground"
          >
            buddhistai.tools
          </a>
        </Button>
        {isAuthenticated ? (
          <Button variant="default" asChild>
            <Link to="/dashboard">Dashboard</Link>
          </Button>
        ) : (
          <Button variant="default" onClick={() => loginWithRedirect()}>
            Login
          </Button>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
