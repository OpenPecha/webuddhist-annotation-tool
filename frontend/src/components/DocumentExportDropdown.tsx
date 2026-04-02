import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { IoDownload, IoChevronDown } from "react-icons/io5";
import { AiOutlineLoading3Quarters } from "react-icons/ai";

export type DocumentExportFormat = "json" | "tei";

type DocumentExportDropdownProps = Readonly<{
  /** Task page: large primary export. Admin: compact outline. */
  variant?: "task" | "admin";
  disabled?: boolean;
  isPending?: boolean;
  onSelectFormat: (format: DocumentExportFormat) => void;
}>;

/**
 * Export menu: JSON (bulk-upload shape) or TEI XML — same options as on the annotation task page.
 */
export function DocumentExportDropdown({
  variant = "admin",
  disabled,
  isPending,
  onSelectFormat,
}: DocumentExportDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isTask = variant === "task";
  const busy = disabled || isPending;

  return (
    <div ref={ref} className={`relative ${isTask ? "w-full" : ""}`}>
      <Button
        type="button"
        onClick={() => !busy && setIsOpen((v) => !v)}
        className={
          isTask
            ? "h-20 w-full cursor-pointer bg-blue-600 text-white hover:bg-blue-700"
            : "rounded-lg border-border/80 bg-background/80"
        }
        variant={isTask ? "default" : "outline"}
        size={isTask ? "lg" : "sm"}
        disabled={busy}
        title="Export text and annotations (JSON or TEI XML)"
      >
        {isPending ? (
          <AiOutlineLoading3Quarters
            className={`h-4 w-4 animate-spin ${isTask ? "mr-2" : "mr-1.5"}`}
          />
        ) : (
          <IoDownload className={`h-4 w-4 ${isTask ? "mr-2" : "mr-1.5"}`} />
        )}
        Export
        <IoChevronDown className="ml-1 h-4 w-4" />
      </Button>
      {isOpen && !busy && (
        <div
          className={`absolute top-full z-50 mt-1 rounded-md border border-border bg-popover py-1 text-popover-foreground shadow-lg ${
            isTask ? "left-0 w-full" : "right-0 min-w-[11rem]"
          }`}
        >
          <button
            type="button"
            className="w-full px-4 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
            onClick={() => {
              onSelectFormat("json");
              setIsOpen(false);
            }}
          >
            Export as JSON
          </button>
          <button
            type="button"
            className="w-full px-4 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
            onClick={() => {
              onSelectFormat("tei");
              setIsOpen(false);
            }}
          >
            Export as TEI XML
          </button>
        </div>
      )}
    </div>
  );
}
