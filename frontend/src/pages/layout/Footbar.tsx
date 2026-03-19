import { Link } from "react-router-dom";

function Footbar() {
  return (
    <footer className="border-t border-border bg-card/50 mt-auto">
      <div className="container mx-auto px-6 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            Built for Tibetan text annotation and preservation
          </p>
          <div className="flex items-center gap-6">
            <a
              href="https://buddhistai.tools"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              buddhistai.tools
            </a>
            <Link
              to="/help"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Help
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footbar;
