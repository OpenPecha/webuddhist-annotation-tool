import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/auth/use-auth-hook";
import ProfileArea from "./ProfileArea";

interface NavbarProps {
  textTitle?: string;
}

const Navbar = ({ textTitle }: NavbarProps) => {
  const { login, isAuthenticated } = useAuth();

  return (
    <nav className="relative z-50 bg-card/90 backdrop-blur-md border-b border-border px-6 py-3 flex justify-between items-center">
      <div className="flex gap-2">
        <Link
          to="/"
          className="flex items-center gap-3 font-display font-semibold text-foreground hover:text-primary transition-colors"
        >
          <img
            alt="icon"
            src="/favicon-32x32.png"
            width={40}
            className="object-contain"
          />
          <div className="flex flex-col">
            <span className="text-xl font-semibold">Text Annotator</span>
            {textTitle && (
              <span className="text-sm font-normal text-muted-foreground truncate max-w-md">
                {textTitle}
              </span>
            )}
          </div>
        </Link>
      </div>
      <div className="flex items-center gap-4">
        {isAuthenticated ? (
          <ProfileArea />
        ) : (
          <Button variant="default" onClick={() => login(false)}>
            Login
          </Button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
