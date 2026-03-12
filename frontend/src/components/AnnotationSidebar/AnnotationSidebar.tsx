import { useRef, useState, useEffect, useCallback } from "react";
import { List, useDynamicRowHeight, useListRef } from "react-window";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  IoTrash,
  IoChevronUp,
  IoChevronDown,
  IoLockClosed,
  IoChatbubbleEllipses,
  IoCheckmarkCircle,
  IoCloseCircle,
} from "react-icons/io5";
import { getAnnotationDisplayLabel, type Annotation } from "@/utils/annotationConverter";
import {
  isStructuralAnnotationType,
  getStructuralAnnotationType,
} from "@/config/structural-annotations";
import { truncateText } from "@/lib/utils";

const ROW_GAP = 12
const BASE_ROW_HEIGHT = 140
const PER_REVIEW_HEIGHT = 56

interface AnnotationSidebarProps {
  annotations: Annotation[];
  onRemoveAnnotation: (id: string) => void;
  onAnnotationClick?: (annotation: Annotation) => void;
  isOpen: boolean;
  onToggle: () => void;
}

interface AnnotationRowProps {
  annotation: Annotation;
  style: React.CSSProperties;
  ariaAttributes?: { role: "listitem"; "aria-posinset": number; "aria-setsize": number };
  index?: number;
  onScrollIntoView?: (index: number) => void;
  getAnnotationColor: (level?: string, type?: string) => string;
  getAnnotationStyle: (annotation: Annotation) => React.CSSProperties;
  onAnnotationClick?: (annotation: Annotation) => void;
  onRemoveAnnotation: (id: string) => void;
}

interface ListRowProps {
  annotations: Annotation[];
  onScrollRowIntoView: (index: number) => void;
  onAnnotationClick?: (annotation: Annotation) => void;
  getAnnotationColor: (level?: string, type?: string) => string;
  getAnnotationStyle: (annotation: Annotation) => React.CSSProperties;
  onRemoveAnnotation: (id: string) => void;
}

function AnnotationListRow(
  props: {
    index: number;
    style: React.CSSProperties;
    ariaAttributes: { role: "listitem"; "aria-posinset": number; "aria-setsize": number };
  } & ListRowProps
) {
  const { index, style, ariaAttributes, annotations, onScrollRowIntoView, onAnnotationClick, getAnnotationColor, getAnnotationStyle, onRemoveAnnotation } = props;
  const annotation = annotations[index];
  if (!annotation) return null;
  return (
    <AnnotationRow
      annotation={annotation}
      style={style}
      ariaAttributes={ariaAttributes}
      index={index}
      onScrollIntoView={onScrollRowIntoView}
      onAnnotationClick={onAnnotationClick}
      getAnnotationColor={getAnnotationColor}
      getAnnotationStyle={getAnnotationStyle}
      onRemoveAnnotation={onRemoveAnnotation}
    />
  );
}

function AnnotationRow({
  annotation,
  style,
  ariaAttributes,
  index,
  onScrollIntoView,
  getAnnotationColor,
  getAnnotationStyle,
  onAnnotationClick,
  onRemoveAnnotation,
}: AnnotationRowProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAnnotationClick?.(annotation);
  };
  return (
    <div style={style} className="pb-3" {...ariaAttributes}>
      <div
        className={`p-3 rounded-lg border transition-all duration-200 bg-white group cursor-pointer ${
          annotation.is_agreed
            ? "border-green-200 bg-green-50/50 hover:bg-green-100/50"
            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
        }`}
        onClick={handleClick}
        onMouseDown={(e) => e.stopPropagation()}
        title={onAnnotationClick != null ? "Click to navigate to this annotation in the editor" : "Click to scroll into view"}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className={`text-xs font-medium ${getAnnotationColor(
                annotation.level,
                annotation.type
              )}`}
              style={getAnnotationStyle(annotation)}
              title={getAnnotationDisplayLabel(annotation)}
            >
              {truncateText(getAnnotationDisplayLabel(annotation), 30)}
            </Badge>
            {annotation.level && (
              <Badge
                variant="outline"
                className={`text-xs font-medium ${
                  annotation.level === "critical"
                    ? "border-red-300 text-red-700 bg-red-50"
                    : annotation.level === "major"
                    ? "border-yellow-300 text-yellow-700 bg-yellow-50"
                    : "border-green-300 text-green-700 bg-green-50"
                }`}
              >
                {annotation.level === "critical"
                  ? "🔴"
                  : annotation.level === "major"
                  ? "🟡"
                  : "🟢"}{" "}
                {annotation.level}
              </Badge>
            )}
            {annotation.is_agreed && (
              <div className="flex items-center gap-1 text-green-600">
                <IoLockClosed className="h-3 w-3" />
                <span className="text-xs font-medium">Agreed</span>
              </div>
            )}
          </div>
          {annotation.is_agreed ? (
            <div className="h-6 w-6 flex items-center justify-center">
              <IoLockClosed className="h-3 w-3 text-green-600" />
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onRemoveAnnotation(annotation.id);
              }}
              className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            >
              <IoTrash className="h-3 w-3" />
            </Button>
          )}
        </div>
        <p className="text-sm font-monlam leading-[normal] text-gray-900 font-medium mb-1 break-words">
          "{truncateText(annotation.text, 30)}"
        </p>
        {annotation.reviews && annotation.reviews.length > 0 && (
          <div className="mt-2 space-y-2">
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <IoChatbubbleEllipses className="h-3 w-3" />
              <span>Reviewer Comments:</span>
            </div>
            {annotation.reviews.map((review: { id: number; decision: "agree" | "disagree"; comment?: string; created_at: string }) => (
              <div
                key={review.id}
                className={`p-2 rounded border text-xs ${
                  review.decision === "agree"
                    ? "bg-green-50 border-green-200"
                    : "bg-red-50 border-red-200"
                }`}
              >
                <div className="flex items-center gap-1 mb-1">
                  {review.decision === "agree" ? (
                    <IoCheckmarkCircle className="h-3 w-3 text-green-600" />
                  ) : (
                    <IoCloseCircle className="h-3 w-3 text-red-600" />
                  )}
                  <span
                    className={`font-medium ${
                      review.decision === "agree"
                        ? "text-green-700"
                        : "text-red-700"
                    }`}
                  >
                    {review.decision === "agree" ? "Agreed" : "Disagreed"}
                  </span>
                  <span className="text-gray-500 ml-auto">
                    {new Date(review.created_at).toLocaleDateString()}
                  </span>
                </div>
                {review.comment && (
                  <p className="text-gray-700 italic">"{review.comment}"</p>
                )}
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-gray-500 mt-2">
          Position {annotation.start}-{annotation.end}
          {annotation.is_agreed && (
            <span className="ml-2 text-green-600">• Locked by reviewer</span>
          )}
        </p>
      </div>
    </div>
  )
}

export const AnnotationSidebar = ({
  annotations,
  onRemoveAnnotation,
  onAnnotationClick,
  isOpen,
  onToggle,
}: AnnotationSidebarProps) => {
  const listRef = useRef<HTMLDivElement>(null);
  const [listSize, setListSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const updateSize = () => {
      setListSize({ width: el.clientWidth, height: el.clientHeight });
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isOpen]);

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

  const listApiRef = useListRef(null);

  const scrollRowIntoView = useCallback((index: number) => {
    listApiRef.current?.scrollToRow({ index, behavior: "smooth", align: "center" });
  }, [listApiRef]);

  
  const rowHeight = useDynamicRowHeight({
    defaultRowHeight: 50
  });
  const rowProps: ListRowProps = {
    annotations,
    onScrollRowIntoView: scrollRowIntoView,
    onAnnotationClick,
    getAnnotationColor,
    getAnnotationStyle,
    onRemoveAnnotation,
  };

  return (
    <div
      className={`flex flex-col mt-4 mb-4 transition-all duration-300 ${
        isOpen ? "h-[75vh]" : "h-auto"
      } w-full`}
    >
      {annotations.length > 0 && <Card
        className={`flex flex-col transition-all duration-300 ${
          isOpen ? "h-full" : "h-auto"
        }`}
      >
        {isOpen ? (
          // Expanded state
          <>
            <CardHeader
              className="px-4 cursor-pointer hover:bg-gray-50 transition-colors duration-200 flex-shrink-0"
              onClick={onToggle}
            >
              <CardTitle className="text-sm font-medium text-gray-900 flex items-center justify-between">
                <span>Annotations ({annotations.length})</span>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary" className="text-xs">
                    {annotations.length}
                  </Badge>
                  <IoChevronUp className="h-4 w-4" />
                </div>
              </CardTitle>
            </CardHeader>
            <div className="flex-1 min-h-0 flex flex-col">
              <CardContent className="pt-0 flex-1 min-h-0">
                {annotations.length === 0 ? (
                  <p className="text-sm text-gray-500 italic text-center py-8">
                    No annotations yet. Select text to add annotations.
                  </p>
                ) : (
                  <div ref={listRef} className="h-full min-h-0">
                    {listSize.height > 0 && (
                      <List<ListRowProps>
                        listRef={listApiRef}
                        rowComponent={AnnotationListRow}
                        rowCount={annotations.length}
                        rowHeight={rowHeight}
                        rowProps={rowProps}
                        style={{ height: listSize.height, width: listSize.width }}
                        overscanCount={5}
                      />
                    )}
                  </div>
                )}
              </CardContent>
            </div>
          </>
        ) : (
          // Collapsed state
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
      </Card>}
    </div>
  );
};
