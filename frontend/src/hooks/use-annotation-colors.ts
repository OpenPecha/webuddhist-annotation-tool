import { useState, useEffect, useCallback, useRef } from "react";

export interface AnnotationColorScheme {
  critical: {
    background: string;
    border: string;
    label: string;
    labelBorder: string;
  };
  major: {
    background: string;
    border: string;
    label: string;
    labelBorder: string;
  };
  minor: {
    background: string;
    border: string;
    label: string;
    labelBorder: string;
  };
  default: {
    background: string;
    border: string;
    label: string;
    labelBorder: string;
  };
}

// Default color scheme matching current CSS
const DEFAULT_COLOR_SCHEME: AnnotationColorScheme = {
  critical: {
    background: "rgba(239, 68, 68, 0.2)",
    border: "#ef4444",
    label: "#ef4444",
    labelBorder: "#dc2626",
  },
  major: {
    background: "rgba(249, 115, 22, 0.2)",
    border: "#f97316",
    label: "#f97316",
    labelBorder: "#ea580c",
  },
  minor: {
    background: "rgba(34, 197, 94, 0.2)",
    border: "#22c55e",
    label: "#22c55e",
    labelBorder: "#16a34a",
  },
  default: {
    background: "rgba(107, 114, 128, 0.2)",
    border: "#6b7280",
    label: "#6b7280",
    labelBorder: "#4b5563",
  },
};

const STORAGE_KEY = "annotation-color-scheme";
const TYPE_COLORS_STORAGE_KEY = "annotation-type-colors";
const DEBOUNCE_DELAY = 1000; // 1 second

import { sanitizeAnnotationTypeForClass } from "@/utils/annotationColorUtils";

export { sanitizeAnnotationTypeForClass };

/** Convert hex to rgba with given alpha */
function hexToRgba(hex: string, alpha: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return hex;
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const useAnnotationColors = () => {
  const [colorScheme, setColorScheme] =
    useState<AnnotationColorScheme>(DEFAULT_COLOR_SCHEME);
  const [pendingColorScheme, setPendingColorScheme] =
    useState<AnnotationColorScheme | null>(null);
  const [annotationTypeColors, setAnnotationTypeColors] = useState<
    Record<string, string>
  >({});
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Apply colors to CSS dynamically (level-based + per-annotation-type)
  const applyColorsToCSS = useCallback(
    (scheme: AnnotationColorScheme, typeColors: Record<string, string> = {}) => {
      // Remove existing custom style if it exists
      const existingStyle = document.getElementById("annotation-color-overrides");
      if (existingStyle) {
        existingStyle.remove();
      }

      const style = document.createElement("style");
      style.id = "annotation-color-overrides";

      const levelCss = `
      /* Dynamic annotation colors (by level) */
      .annotation-critical {
        background-color: ${scheme.critical.background} !important;
        border-bottom-color: ${scheme.critical.border} !important;
      }
      
      .annotation-major {
        background-color: ${scheme.major.background} !important;
        border-bottom-color: ${scheme.major.border} !important;
      }
      
      .annotation-minor {
        background-color: ${scheme.minor.background} !important;
        border-bottom-color: ${scheme.minor.border} !important;
      }
      
      .annotation-default {
        background-color: ${scheme.default.background} !important;
        border-bottom-color: ${scheme.default.border} !important;
      }
      
      /* Dynamic annotation label colors (by level) */
      .annotation-label-critical {
        background-color: ${scheme.critical.label} !important;
        border-color: ${scheme.critical.labelBorder} !important;
      }
      
      .annotation-label-major {
        background-color: ${scheme.major.label} !important;
        border-color: ${scheme.major.labelBorder} !important;
      }
      
      .annotation-label-minor {
        background-color: ${scheme.minor.label} !important;
        border-color: ${scheme.minor.labelBorder} !important;
      }
      
      .annotation-label-default {
        background-color: ${scheme.default.label} !important;
        border-color: ${scheme.default.labelBorder} !important;
      }
    `;

      const typeCss = Object.entries(typeColors)
        .map(([typeName, hex]) => {
          const cls = sanitizeAnnotationTypeForClass(typeName);
          if (!cls || cls === "default") return "";
          const background = hexToRgba(hex, 0.25);
          return `
      .annotation-type-${cls} {
        background-color: ${background} !important;
        border-bottom-color: ${hex} !important;
      }
      .annotation-label-type-${cls} {
        background-color: ${hex} !important;
        border-color: ${hex} !important;
        color: #fff !important;
      }
      `;
        })
        .join("");

      style.textContent = levelCss + "\n/* Per-annotation-type colors */\n" + typeCss;
      document.head.appendChild(style);
    },
    []
  );

  const typeColorsRef = useRef<Record<string, string>>({});
  typeColorsRef.current = annotationTypeColors;

  // Debounced update function (level scheme only)
  const debouncedUpdate = useCallback(
    (scheme: AnnotationColorScheme) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      setPendingColorScheme(scheme);
      setIsSaving(true);

      saveTimeoutRef.current = setTimeout(() => {
        try {
          setColorScheme(scheme);
          applyColorsToCSS(scheme, typeColorsRef.current);

          localStorage.setItem(STORAGE_KEY, JSON.stringify(scheme));
        } catch (error) {
          console.error(
            "Failed to save annotation colors to localStorage:",
            error
          );
        } finally {
          setIsSaving(false);
          setPendingColorScheme(null);
          saveTimeoutRef.current = null;
        }
      }, DEBOUNCE_DELAY);
    },
    [applyColorsToCSS]
  );

  // Load level scheme and type colors from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      let scheme = DEFAULT_COLOR_SCHEME;
      if (saved) {
        const parsed = JSON.parse(saved);
        scheme = { ...DEFAULT_COLOR_SCHEME, ...parsed };
        setColorScheme(scheme);
      }

      const savedTypeColors = localStorage.getItem(TYPE_COLORS_STORAGE_KEY);
      let typeColors: Record<string, string> = {};
      if (savedTypeColors) {
        try {
          typeColors = JSON.parse(savedTypeColors);
          setAnnotationTypeColors(typeColors);
        } catch {
          // ignore invalid type colors
        }
      }
      typeColorsRef.current = typeColors;

      applyColorsToCSS(scheme, typeColors);
    } catch (error) {
      console.error(
        "Failed to load annotation colors from localStorage:",
        error
      );
      applyColorsToCSS(DEFAULT_COLOR_SCHEME, {});
    } finally {
      setIsLoaded(true);
    }
  }, [applyColorsToCSS]);

  // Update color scheme with proper debouncing
  const updateColorScheme = useCallback(
    (newScheme: AnnotationColorScheme) => {
      // Use debounced update for both UI and localStorage
      debouncedUpdate(newScheme);
    },
    [debouncedUpdate]
  );

  // Reset to default colors (level scheme only; type colors kept)
  const resetToDefaults = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    setPendingColorScheme(null);
    setColorScheme(DEFAULT_COLOR_SCHEME);
    applyColorsToCSS(DEFAULT_COLOR_SCHEME, typeColorsRef.current);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_COLOR_SCHEME));
      setIsSaving(false);
    } catch (error) {
      console.error("Failed to save default colors to localStorage:", error);
    }
  }, [applyColorsToCSS]);

  // Update color for one annotation type (e.g. "pos", "error_typology")
  const updateAnnotationTypeColor = useCallback(
    (typeName: string, color: string) => {
      const next = { ...annotationTypeColors, [typeName]: color };
      setAnnotationTypeColors(next);
      typeColorsRef.current = next;
      applyColorsToCSS(colorScheme, next);
      try {
        localStorage.setItem(TYPE_COLORS_STORAGE_KEY, JSON.stringify(next));
      } catch (error) {
        console.error(
          "Failed to save annotation type colors to localStorage:",
          error
        );
      }
    },
    [annotationTypeColors, colorScheme, applyColorsToCSS]
  );

  // Reset per-annotation-type colors only
  const resetAnnotationTypeColors = useCallback(() => {
    setAnnotationTypeColors({});
    typeColorsRef.current = {};
    applyColorsToCSS(colorScheme, {});
    try {
      localStorage.removeItem(TYPE_COLORS_STORAGE_KEY);
    } catch (error) {
      console.error(
        "Failed to clear annotation type colors from localStorage:",
        error
      );
    }
  }, [colorScheme, applyColorsToCSS]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Get the currently displayed color scheme (pending if exists, otherwise current)
  const displayColorScheme = pendingColorScheme || colorScheme;

  return {
    colorScheme: displayColorScheme,
    updateColorScheme,
    resetToDefaults,
    annotationTypeColors,
    updateAnnotationTypeColor,
    resetAnnotationTypeColors,
    isLoaded,
    isSaving,
  };
};
