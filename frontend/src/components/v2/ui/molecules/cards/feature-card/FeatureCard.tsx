import { BookOpen, Users, Zap, Eye, FileText } from "lucide-react";

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
  {
    icon: <FileText className="w-6 h-6" />,
    title: "Parallel Editing",
    description: "Edit source and target text side by side",
  },
];

function FeatureCard() {
  return (
    <div className="space-y-8">
      <h2 className="font-display text-2xl font-semibold text-foreground">
        Features
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature) => (
          <div
            key={feature.title}
            className="group p-6 rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-md transition-all duration-300 hover:-translate-y-0.5"
          >
            <div className="flex flex-col space-y-3">
              <div className="p-3 w-fit rounded-lg bg-primary/10 text-primary group-hover:bg-primary/15 transition-colors">
                {feature.icon}
              </div>
              <h3 className="font-display font-semibold text-foreground">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground">
                {feature.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default FeatureCard;
