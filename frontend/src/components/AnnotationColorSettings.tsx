import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  IoSettings,
  IoClose,
  IoRefresh,
  IoColorPalette,
  IoChevronUp,
  IoChevronDown,
} from "react-icons/io5";
import {
  useAnnotationColors,
  type AnnotationColorScheme,
} from "@/hooks/use-annotation-colors";
import { useAnnotationTypes } from "@/hooks";
import { toast } from "sonner";

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
  icon?: string;
}

const ColorPicker: React.FC<ColorPickerProps> = ({
  label,
  value,
  onChange,
  icon,
}) => {
  const inputId = `color-${label.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        {icon && <span className="text-sm">{icon}</span>}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <div
          className="w-6 h-6 rounded border border-gray-300 cursor-pointer relative overflow-hidden"
          style={{ backgroundColor: value }}
          title={`Click to change ${label.toLowerCase()} color`}
        >
          <input
            id={inputId}
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            aria-label={`${label} color picker`}
          />
        </div>
        <span className="text-xs text-gray-500 font-mono">{value}</span>
      </div>
    </div>
  );
};

interface LevelSectionProps {
  level: keyof AnnotationColorScheme;
  colors: AnnotationColorScheme[keyof AnnotationColorScheme];
  onUpdate: (
    level: keyof AnnotationColorScheme,
    colors: AnnotationColorScheme[keyof AnnotationColorScheme]
  ) => void;
  icon: string;
  title: string;
}

const LevelSection: React.FC<LevelSectionProps> = ({
  level,
  colors,
  onUpdate,
  icon,
  title,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const updateColor = (type: keyof typeof colors, color: string) => {
    onUpdate(level, { ...colors, [type]: color });
  };

  return (
    <div className="border border-gray-200 rounded-lg">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm">{icon}</span>
          <span className="text-sm font-medium">{title}</span>
          <Badge
            className="text-xs"
            style={{
              backgroundColor: colors.label,
              borderColor: colors.labelBorder,
              color: "white",
            }}
          >
            Preview
          </Badge>
        </div>
        {isExpanded ? (
          <IoChevronUp className="w-4 h-4 text-gray-500" />
        ) : (
          <IoChevronDown className="w-4 h-4 text-gray-500" />
        )}
      </button>

      {isExpanded && (
        <div className="p-3 border-t border-gray-200 space-y-3 bg-gray-50">
          <ColorPicker
            label="Background"
            value={rgbaToHex(colors.background)}
            onChange={(color) => {
              const rgb = hexToRgb(color);
              updateColor(
                "background",
                `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)`
              );
            }}
          />
          <ColorPicker
            label="Border"
            value={colors.border}
            onChange={(color) => updateColor("border", color)}
          />
          <ColorPicker
            label="Label"
            value={colors.label}
            onChange={(color) => updateColor("label", color)}
          />
          <ColorPicker
            label="Label Border"
            value={colors.labelBorder}
            onChange={(color) => updateColor("labelBorder", color)}
          />
        </div>
      )}
    </div>
  );
};

// Helper function to convert hex to rgb
const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
};

// Helper function to convert rgba to hex
const rgbaToHex = (rgba: string): string => {
  const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
  if (match) {
    const r = parseInt(match[1], 10);
    const g = parseInt(match[2], 10);
    const b = parseInt(match[3], 10);
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }
  return rgba.startsWith("#") ? rgba : "#000000";
};

const DEFAULT_TYPE_COLOR = "#6b7280";

export const AnnotationColorSettings: React.FC = () => {
  const {
    colorScheme,
    updateColorScheme,
    resetToDefaults,
    annotationTypeColors,
    updateAnnotationTypeColor,
    resetAnnotationTypeColors,
    isSaving,
  } = useAnnotationColors();
  const { data: annotationTypes = [] } = useAnnotationTypes();
  const [isOpen, setIsOpen] = useState(false);

  const updateLevelColors = (
    level: keyof AnnotationColorScheme,
    colors: AnnotationColorScheme[keyof AnnotationColorScheme]
  ) => {
    updateColorScheme({
      ...colorScheme,
      [level]: colors,
    });

    // Show feedback toast
    toast.success(`Updating ${level} colors`, {
      description: "Colors will be applied after 1 second of no changes",
      duration: 2000,
    });
  };

  const handleReset = () => {
    resetToDefaults();
    toast.success("Colors reset to defaults", {
      description:
        "All annotation colors have been restored to their original values",
      duration: 3000,
    });
  };

  const testLocalStorage = () => {
    try {
      const saved = localStorage.getItem("annotation-color-scheme");
      if (saved) {
        toast.success("localStorage Test", {
          description: `Found saved colors: ${JSON.stringify(
            JSON.parse(saved),
            null,
            2
          ).slice(0, 100)}...`,
          duration: 5000,
        });
      } else {
        toast.info("localStorage Test", {
          description: "No saved colors found in localStorage",
          duration: 3000,
        });
      }
    } catch (error) {
      toast.error("localStorage Test Failed", {
        description: `Error: ${error}`,
        duration: 3000,
      });
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isOpen ? (
        <Card className="w-80 shadow-lg border border-gray-200 bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <IoColorPalette className="w-4 h-4" />
                <span>Annotation Colors</span>
                {isSaving && (
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                    <span className="text-xs text-blue-600">Saving...</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={testLocalStorage}
                  className="h-6 w-6 p-0"
                  title="Test localStorage"
                >
                  <span className="text-xs">💾</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  className="h-6 w-6 p-0"
                  title="Reset to defaults"
                  disabled={isSaving}
                >
                  <IoRefresh className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="h-6 w-6 p-0"
                  title="Close settings"
                >
                  <IoClose className="w-3 h-3" />
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3 max-h-96 overflow-y-auto">
            {/* <LevelSection
              level="critical"
              colors={colorScheme.critical}
              onUpdate={updateLevelColors}
              icon="🔴"
              title="Critical"
            /> */}
         

            {/* Per-annotation-type colors */}
            {annotationTypes.length > 0 && (
              <div className="border-t border-gray-200 pt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">By annotation type</span>
                  {Object.keys(annotationTypeColors).length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => {
                        resetAnnotationTypeColors();
                        toast.success("Annotation type colors cleared");
                      }}
                    >
                      Clear all
                    </Button>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  Overrides level colors for marks and labels of each type.
                </p>
                <div className="space-y-2">
                  {annotationTypes.map((type) => (
                    <div
                      key={type.id}
                      className="flex items-center justify-between gap-2 p-2 rounded bg-gray-50"
                    >
                      <span className="text-sm truncate flex-1 min-w-0">
                        {type.name}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <div
                          className="w-6 h-6 rounded border border-gray-300 cursor-pointer relative overflow-hidden"
                          style={{
                            backgroundColor:
                              annotationTypeColors[type.name] ?? DEFAULT_TYPE_COLOR,
                          }}
                          title={`Color for ${type.name}`}
                        >
                          <input
                            type="color"
                            value={
                              annotationTypeColors[type.name] ?? DEFAULT_TYPE_COLOR
                            }
                            onChange={(e) =>
                              updateAnnotationTypeColor(type.name, e.target.value)
                            }
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            aria-label={`${type.name} color`}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>

          {/* Footer with localStorage info */}
          <div className="px-4 pb-3">
            <div className="text-xs text-gray-500 text-center border-t border-gray-200 pt-2">
              <div className="flex items-center justify-center gap-2">
                {isSaving ? (
                  <>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span>Applying changes...</span>
                  </>
                ) : (
                  <>
                    <span>💾</span>
                    <span>Changes applied after 1 second</span>
                  </>
                )}
              </div>
              <div className="mt-1 text-gray-400">
                Colors update and save together when you stop editing
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <Button
          onClick={() => setIsOpen(true)}
          className="h-10 w-10 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 text-white"
          title="Annotation color settings"
        >
          <IoSettings className="w-5 h-5" />
        </Button>
      )}
    </div>
  );
};
