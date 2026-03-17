import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  IoTrash,
  IoTrashBin,
  IoChevronUp,
  IoChevronDown,
  IoChevronForward,
  IoLockClosed,
  IoRepeat,
} from "react-icons/io5";
import { getAnnotationDisplayLabel, getDisplayLabelForFilter, type Annotation } from "@/utils/annotationConverter";
import {
  isStructuralAnnotationType,
  getStructuralAnnotationType,
} from "@/config/structural-annotations";
import { truncateText } from "@/lib/utils";

/**
 * Get the line containing the span [start, end] and the highlight range within that line.
 * Uses \n as line separator.
 */
function getLineWithHighlight(
  fullText: string,
  start: number,
  end: number
): { lineText: string; highlightStart: number; highlightEnd: number } | null {
  if (!fullText || start < 0 || end > fullText.length) return null;
  const lines = fullText.split(/\r?\n/);
  let offset = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineStart = offset;
    const lineEnd = offset + line.length;
    if (start < lineEnd) {
      const highlightStart = Math.max(0, start - lineStart);
      const highlightEnd = Math.min(line.length, end - lineStart);
      return { lineText: line, highlightStart, highlightEnd };
    }
    offset = lineEnd + (i < lines.length - 1 ? 1 : 0);
  }
  return null;
}

/** Group key: same type/label + same text = one group */
function getGroupKey(ann: Annotation): string {
  return `${getDisplayLabelForFilter(ann)}|${ann.text}`;
}

export interface AnnotationGroup {
  groupKey: string;
  items: Annotation[];
}

function groupAnnotations(annotations: Annotation[]): AnnotationGroup[] {
  const map = new Map<string, Annotation[]>();
  for (const ann of annotations) {
    const key = getGroupKey(ann);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(ann);
  }
  return Array.from(map.entries())
    .map(([groupKey, items]) => ({ groupKey, items }))
    .sort((a, b) => (a.items[0]?.start ?? 0) - (b.items[0]?.start ?? 0));
}

interface AnnotationSidebarProps {
  annotations: Annotation[];
  fullText?: string;
  isBulkOperationPending?: boolean;
  onRemoveAnnotation: (id: string) => void;
  onAnnotationClick?: (annotation: Annotation) => void;
  onApplyToAll?: (annotation: Annotation) => void;
  onRemoveFromAll?: (annotation: Annotation) => void;
  isOpen: boolean;
  onToggle: () => void;
}

interface GroupHeaderProps {
  group: AnnotationGroup;
  isExpanded: boolean;
  onToggleExpand: () => void;
  isBulkOperationPending?: boolean;
  getAnnotationColor: (level?: string, type?: string) => string;
  getAnnotationStyle: (annotation: Annotation) => React.CSSProperties;
  onApplyToAll?: (annotation: Annotation) => void;
  onRemoveFromAll?: (annotation: Annotation) => void;
}

function GroupHeader({
  group,
  isExpanded,
  onToggleExpand,
  isBulkOperationPending,
  getAnnotationColor,
  getAnnotationStyle,
  onApplyToAll,
  onRemoveFromAll,
}: GroupHeaderProps) {
  const first = group.items[0];
  if (!first) return null;
  const hasAgreed = group.items.some((a) => a.is_agreed);
  const canModify = !hasAgreed;

  return (
    <div className="flex items-center gap-2 p-3 rounded-lg border border-gray-200 bg-gray-50/80 hover:bg-gray-100/80 transition-colors">
      <button
        type="button"
        className="flex-1 min-w-0 flex items-center gap-2 flex-wrap text-left"
        onClick={onToggleExpand}
        aria-expanded={isExpanded}
        aria-label={isExpanded ? "Collapse group" : "Expand group"}
      >
        <IoChevronForward
          className={`h-4 w-4 text-gray-600 transition-transform flex-shrink-0 ${isExpanded ? "rotate-90" : ""}`}
        />
        <Badge
          variant="secondary"
          className={`text-xs font-medium ${getAnnotationColor(first.level, first.type)}`}
          style={getAnnotationStyle(first)}
          title={getAnnotationDisplayLabel(first)}
        >
          {truncateText(getAnnotationDisplayLabel(first), 20)}
        </Badge>
        <span className="text-sm font-monlam text-gray-900 truncate" title={first.text}>
          "{truncateText(first.text, 25)}"
        </span>
        <span className="text-xs text-gray-500 flex-shrink-0">
          {group.items.length} {group.items.length === 1 ? "position" : "positions"}
        </span>
        {hasAgreed && (
          <span className="flex items-center gap-0.5 text-xs text-green-600 flex-shrink-0">
            <IoLockClosed className="h-3 w-3" /> Agreed
          </span>
        )}
      </button>
      {canModify && (onApplyToAll != null || onRemoveFromAll != null) && (
        <div className="flex items-center gap-0.5 flex-shrink-0 relative">
          {isBulkOperationPending && (
            <span
              className="absolute inset-0 flex items-center justify-center bg-white/80 rounded z-10"
              aria-hidden
            >
              <span className="animate-spin inline-block h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
            </span>
          )}
          {onApplyToAll && (
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onApplyToAll(first);
              }}
              disabled={isBulkOperationPending}
              className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              title="Apply to all occurrences"
            >
              <IoRepeat className="h-3.5 w-3.5" />
            </Button>
          )}
          {onRemoveFromAll && (
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemoveFromAll(first);
              }}
              disabled={isBulkOperationPending}
              className="h-7 w-7 p-0 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
              title="Remove from all occurrences"
            >
              <IoTrashBin className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

interface PositionRowProps {
  annotation: Annotation;
  fullText?: string;
  onAnnotationClick?: (annotation: Annotation) => void;
  onRemoveAnnotation: (id: string) => void;
  isAgreed: boolean;
}

function PositionRow({
  annotation,
  fullText,
  onAnnotationClick,
  onRemoveAnnotation,
  isAgreed,
}: PositionRowProps) {
  const lineWithHighlight =
    fullText != null
      ? getLineWithHighlight(fullText, annotation.start, annotation.end)
      : null;

  const content =
    lineWithHighlight != null ? (
      <span className="text-xs font-monlam text-gray-800 break-words leading-relaxed">
        {lineWithHighlight.highlightStart > 0 && (
          <span>{lineWithHighlight.lineText.slice(0, lineWithHighlight.highlightStart)}</span>
        )}
        <mark className="bg-yellow-200 px-0.5 rounded font-medium">
          {lineWithHighlight.lineText.slice(
            lineWithHighlight.highlightStart,
            lineWithHighlight.highlightEnd
          )}
        </mark>
        {lineWithHighlight.highlightEnd < lineWithHighlight.lineText.length && (
          <span>
            {lineWithHighlight.lineText.slice(lineWithHighlight.highlightEnd)}
          </span>
        )}
      </span>
    ) : (
      <span className="text-xs font-medium text-gray-700 font-mono">
        Position {annotation.start}–{annotation.end}
      </span>
    );

  return (
    <div className="flex items-center justify-between gap-2 pl-8 pr-2 py-1.5 rounded border border-transparent hover:border-gray-200 hover:bg-white group/row transition-colors">
      <button
        type="button"
        className="flex-1 flex items-center justify-between gap-2 text-left min-w-0"
        onClick={() => onAnnotationClick?.(annotation)}
        title="Click to scroll to this position in the editor"
      >
        {content}
      </button>
      {!isAgreed && (
        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemoveAnnotation(annotation.id);
          }}
          className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 opacity-0 group-hover/row:opacity-100 transition-opacity flex-shrink-0"
          title="Remove this occurrence only"
        >
          <IoTrash className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

export const AnnotationSidebar = ({
  annotations,
  fullText,
  isBulkOperationPending = false,
  onRemoveAnnotation,
  onAnnotationClick,
  onApplyToAll,
  onRemoveFromAll,
  isOpen,
  onToggle,
}: AnnotationSidebarProps) => {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const grouped = useMemo(() => groupAnnotations(annotations), [annotations]);

  const toggleGroup = useCallback((groupKey: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      return next;
    });
  }, []);

  const getAnnotationColor = useCallback((level?: string, type?: string) => {
    if (type && isStructuralAnnotationType(type)) {
      const structuralType = getStructuralAnnotationType(type);
      if (structuralType) return "";
    }
    switch (level) {
      case "critical":
        return "bg-red-100 text-red-800";
      case "major":
        return "bg-orange-100 text-orange-800";
      case "minor":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  }, []);

  const getAnnotationStyle = useCallback((annotation: Annotation) => {
    if (isStructuralAnnotationType(annotation.type)) {
      const structuralType = getStructuralAnnotationType(annotation.type);
      if (structuralType) {
        return {
          backgroundColor: structuralType.backgroundColor,
          color: structuralType.color,
          borderColor: structuralType.borderColor,
        };
      }
    }
    return {};
  }, []);

  return (
    <div
      className={`flex flex-col mt-4 mb-4 transition-all duration-300 ${
        isOpen ? "h-[75vh]" : "h-auto"
      } w-full`}
    >
      {annotations.length > 0 && (
        <Card
          className={`flex flex-col transition-all duration-300 ${
            isOpen ? "h-full" : "h-auto"
          }`}
        >
          {isOpen ? (
            <>
              <CardHeader
                className="px-4 cursor-pointer hover:bg-gray-50 transition-colors duration-200 flex-shrink-0"
                onClick={onToggle}
              >
                <CardTitle className="text-sm font-medium text-gray-900 flex items-center justify-between">
                  <span>Annotations ({annotations.length})</span>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className="text-xs">
                      {grouped.length} groups
                    </Badge>
                    <IoChevronUp className="h-4 w-4" />
                  </div>
                </CardTitle>
              </CardHeader>
              <div className="flex-1 min-h-0 flex flex-col relative">
                {isBulkOperationPending && (
                  <div
                    className="absolute inset-0 flex items-center justify-center bg-white/90 z-20 rounded-b-lg"
                    aria-live="polite"
                    aria-busy="true"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <span
                        className="animate-spin inline-block h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full"
                        aria-hidden
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Applying changes...
                      </span>
                    </div>
                  </div>
                )}
                <CardContent className="pt-0 flex-1 min-h-0 overflow-hidden flex flex-col">
                  {grouped.length === 0 ? (
                    <p className="text-sm text-gray-500 italic text-center py-8">
                      No annotations yet. Select text to add annotations.
                    </p>
                  ) : (
                    <div className="overflow-y-auto flex-1 min-h-0 space-y-2 pr-1">
                      {grouped.map((group) => (
                        <div key={group.groupKey} className="space-y-0.5">
                          <GroupHeader
                            group={group}
                            isExpanded={expandedGroups.has(group.groupKey)}
                            onToggleExpand={() => toggleGroup(group.groupKey)}
                            isBulkOperationPending={isBulkOperationPending}
                            getAnnotationColor={getAnnotationColor}
                            getAnnotationStyle={getAnnotationStyle}
                            onApplyToAll={onApplyToAll}
                            onRemoveFromAll={onRemoveFromAll}
                          />
                          {expandedGroups.has(group.groupKey) && (
                            <div className="space-y-0.5 pt-0.5">
                              {group.items.map((ann) => (
                                <PositionRow
                                  key={ann.id}
                                  annotation={ann}
                                  fullText={fullText}
                                  onAnnotationClick={onAnnotationClick}
                                  onRemoveAnnotation={onRemoveAnnotation}
                                  isAgreed={!!ann.is_agreed}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </div>
            </>
          ) : (
            <div className="px-4 py-2 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                Annotations ({annotations.length})
              </span>
              <button
                onClick={onToggle}
                className="h-6 w-6 p-0 hover:bg-blue-50 rounded transition-all duration-200 flex items-center justify-center"
                title="Expand Annotations"
              >
                <IoChevronDown className="h-4 w-4 text-blue-600" />
              </button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};
