function Window() {
  return (
    <div className="rounded-xl border border-border bg-card/80 backdrop-blur-sm p-8 shadow-sm">
      <div className="space-y-4">
        <h3 className="font-display text-lg font-semibold text-foreground">
          Translation & annotation platform
        </h3>
        <p className="text-muted-foreground max-w-2xl leading-relaxed">
          Work with Tibetan texts using parallel text editing, real-time collaboration,
          and comprehensive annotation tools. Designed for translators and scholars.
        </p>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
          <li className="flex items-center gap-2">
            <span className="text-primary">✓</span> Parallel text editing
          </li>
          <li className="flex items-center gap-2">
            <span className="text-primary">✓</span> Real-time collaboration
          </li>
          <li className="flex items-center gap-2">
            <span className="text-primary">✓</span> Annotation tools
          </li>
          <li className="flex items-center gap-2">
            <span className="text-primary">✓</span> Review workflow
          </li>
        </ul>
      </div>
    </div>
  );
}

export default Window;
