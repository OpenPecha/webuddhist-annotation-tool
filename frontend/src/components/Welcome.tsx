import { Link } from "react-router-dom";
import { BookOpen, Users, Zap, CheckCircle, FileText, Eye } from "lucide-react";

export const Welcome = () => {
  const features = [
    {
      icon: <BookOpen className="w-6 h-6" />,
      title: "Text Annotation",
      description: "Annotate Tibetan texts with precision and ease",
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Collaborative",
      description: "Work together with reviewers and annotators",
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Fast & Efficient",
      description: "Streamlined workflow for maximum productivity",
    },
    {
      icon: <Eye className="w-6 h-6" />,
      title: "Review System",
      description: "Quality control through structured review process",
    },
  ];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Subtle paper texture / gradient mesh */}
      <div
        className="absolute inset-0 opacity-[0.4] dark:opacity-20 pointer-events-none"
        style={{
          backgroundImage: `
            radial-gradient(ellipse 80% 50% at 70% -20%, oklch(0.55 0.18 45 / 0.08), transparent),
            radial-gradient(ellipse 60% 40% at 0% 100%, oklch(0.55 0.12 45 / 0.06), transparent)
          `,
        }}
      />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMwMDAiIGZpbGwtb3BhY2l0eT0iMC4wMiI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMS41Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-60 dark:opacity-30 pointer-events-none" />

      <div className="container relative mx-auto px-4 py-16 md:py-24">
        <div className="max-w-6xl mx-auto">
          {/* Hero */}
          <div className="text-center space-y-8 mb-20">
            <div className="space-y-4">
              <div className="flex justify-center mb-6 animate-reveal">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full scale-150" />
                  <div className="relative p-4 rounded-2xl bg-card border border-border shadow-sm">
                    <FileText className="w-14 h-14 text-primary" strokeWidth={1.5} />
                  </div>
                </div>
              </div>
              <h1 className="font-display text-5xl md:text-7xl font-semibold text-foreground tracking-tight animate-reveal animate-reveal-delay-1">
                Buddhist AI Tool
              </h1>
              <p className="font-display text-2xl md:text-3xl font-medium text-primary animate-reveal animate-reveal-delay-2">
                Annotation Platform
              </p>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed animate-reveal animate-reveal-delay-3">
                A powerful platform for annotating and reviewing Tibetan texts with collaborative tools and intelligent workflows
              </p>
            </div>

            <div className="flex justify-center pt-4 animate-reveal animate-reveal-delay-4">
              <Link
                to="/login"
                className="group inline-flex items-center gap-3 px-8 py-4 bg-primary text-primary-foreground font-medium rounded-xl shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:bg-primary/90 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
              >
                <span>Get Started</span>
                <svg
                  className="w-5 h-5 group-hover:translate-x-0.5 transition-transform"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className={`group p-6 bg-card border border-border rounded-xl shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-300 hover:-translate-y-0.5 animate-reveal ${
                  index === 0 ? "animate-reveal-delay-2" : index === 1 ? "animate-reveal-delay-3" : index === 2 ? "animate-reveal-delay-4" : "animate-reveal-delay-5"
                }`}
              >
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="p-3 rounded-xl bg-primary/10 text-primary group-hover:bg-primary/15 transition-colors">
                    {feature.icon}
                  </div>
                  <h3 className="font-display font-semibold text-lg text-foreground">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Why choose */}
          <div className="mt-20 text-center space-y-8 animate-reveal">
            <h2 className="font-display text-3xl font-semibold text-foreground">
              Why Choose Text Annotation Tool?
            </h2>
            <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-3 text-left">
              {[
                "Intuitive annotation interface",
                "Real-time collaboration",
                "Advanced review system",
                "Comprehensive export options",
                "User-friendly dashboard",
                "Secure authentication",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 p-4 bg-card border border-border rounded-lg hover:border-primary/20 transition-colors"
                >
                  <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-foreground">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <footer className="relative border-t border-border py-8 mt-16">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p className="text-sm">
            Built for Tibetan text annotation and preservation
          </p>
        </div>
      </footer>
    </div>
  );
};
