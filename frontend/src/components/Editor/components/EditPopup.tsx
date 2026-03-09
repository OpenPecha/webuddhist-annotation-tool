import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import {
  IoClose,
  IoAdd,
  IoSearch,
  IoChatbubbleEllipses,
  IoCheckmarkCircle,
  IoCloseCircle,
} from "react-icons/io5";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import {
  extractLeafNodes,
  type AnnotationConfig,
  type AnnotationOption,
} from "@/config/annotation-options";
import type { Annotation } from "@/utils/annotationConverter";
import { getAnnotationDisplayLabel } from "@/utils/annotationConverter";
import { truncateText } from "@/lib/utils";
import { useAnnotationFiltersStore } from "@/store/annotationFilters";
import { useCustomAnnotationsStore } from "@/store/customAnnotations";
import { useAnnotationListHierarchical, useAnnotationTypes } from "@/hooks/";

interface EditPopupProps {
  visible: boolean;
  position: { x: number; y: number };
  annotation: Annotation | null;
  /** Full document content - used to derive selected text so display matches document (fixes XML encoding issues) */
  content?: string;
  isUpdatingAnnotation?: boolean;
  onUpdate: (
    annotationId: string,
    newType: string,
    newText?: string,
    newLevel?: string
  ) => void;
  onDelete: () => void;
  onCancel: () => void;
}

export const EditPopup: React.FC<EditPopupProps> = ({
  visible,
  position,
  annotation,
  content,
  isUpdatingAnnotation = false,
  onUpdate,
  onDelete,
  onCancel,
}) => {
  const [annotationConfig, setAnnotationConfig] =
    useState<AnnotationConfig | null>(null);
  const [selectedType, setSelectedType] = useState<string>("");
  const [annotationText, setAnnotationText] = useState<string>("");
  const [selectedLevel, setSelectedLevel] = useState<string>("");
  const [customInput, setCustomInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const { selectedAnnotationListType } = useAnnotationFiltersStore();
  const { getCustomOptions, addCustomAnnotation } = useCustomAnnotationsStore();
  const { data: annotationTypes = [] } = useAnnotationTypes();

  const listTypeId =
    annotation?.type != null
      ? annotationTypes.find((t) => t.name === annotation.type)?.id ?? ""
      : selectedAnnotationListType;

  const { data: annotationList } = useAnnotationListHierarchical({
    type_id: listTypeId,
    enabled: !!listTypeId,
  });

  useEffect(() => {
    if (!annotationList?.categories) return;
    const config = extractLeafNodes(annotationList.categories, 0);
    setAnnotationConfig({ options: config });
  }, [annotationList]);

  useEffect(() => {
    if (annotation) {
      setSelectedType(getAnnotationDisplayLabel(annotation));
      setAnnotationText(annotation.name || "");
      setSelectedLevel(annotation.level || "");
      setSearchQuery("");
    }
  }, [annotation]);

  if (!visible || !annotation || !annotationConfig) return null;

  const displayLabel = getAnnotationDisplayLabel(annotation);
  const customOptions = getCustomOptions(listTypeId);
  const currentValueOption =
    (annotation.type || displayLabel) &&
    !annotationConfig.options.some(
      (o) =>
        o.id === annotation.type ||
        o.label === annotation.type ||
        o.id === displayLabel ||
        o.label === displayLabel
    ) &&
    !customOptions.some(
      (o) =>
        o.id === annotation.type ||
        o.label === annotation.type ||
        o.id === displayLabel ||
        o.label === displayLabel
    )
      ? {
          id: displayLabel,
          label: displayLabel,
          color: "#ffffff",
          backgroundColor: "rgba(249, 115, 22, 0.2)",
          borderColor: "#f97316",
          icon: "⚠️",
        }
      : null;
  const allOptions = [
    ...annotationConfig.options,
    ...customOptions,
    ...(currentValueOption ? [currentValueOption] : []),
  ];

  const q = searchQuery.trim().toLowerCase();
  const filteredOptions = q
    ? allOptions.filter((o) => {
        if (o.label?.toLowerCase().includes(q) || o.id?.toLowerCase().includes(q))
          return true;
        if ("mnemonic" in o && typeof o.mnemonic === "string" && o.mnemonic.toLowerCase().includes(q))
          return true;
        if ("description" in o && typeof o.description === "string" && o.description.toLowerCase().includes(q))
          return true;
        return false;
      })
    : allOptions;

  // Additional safeguard: Don't allow editing of agreed annotations
  if (annotation.is_agreed) {
    return (
      <div
        className="edit-popup absolute bg-white border border-gray-200 rounded-lg shadow-xl p-4 z-50 min-w-[400px] max-w-[500px]"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: "translateX(-50%)",
        }}
      >
        {/* Close button */}
        <Button
          onClick={onCancel}
          variant="ghost"
          size="sm"
          className="absolute top-2 right-2 h-6 w-6 p-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
        >
          <IoClose className="w-4 h-4" />
        </Button>

        <div className="mb-3 pr-8">
          <div className="flex items-center gap-2 mb-3">
            <div className="text-green-600 text-lg">🔒</div>
            <h3 className="text-sm font-semibold text-green-700">
              Annotation Locked
            </h3>
          </div>

          {/* Current annotation text */}
          <div className="mb-3 p-3 bg-green-50 rounded-lg border border-green-200">
            <p className="text-xs text-green-600 mb-1">
              This annotation has been approved:
            </p>
            <p className="text-sm text-green-700 font-medium">
              "{truncateText(annotation.text, 100)}"
            </p>
            <p className="text-xs text-green-600 mt-2">
              Type:{" "}
              <span className="font-medium capitalize">{displayLabel}</span>
              {annotation.name && <span> • Note: "{annotation.name}"</span>}
            </p>
          </div>

          {/* Reviewer Comments Section */}
          {annotation.reviews && annotation.reviews.length > 0 && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <IoChatbubbleEllipses className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">
                  Reviewer Feedback
                </span>
              </div>
              <div className="max-h-32 overflow-y-auto space-y-2">
                {annotation.reviews.map((review, index) => (
                  <div
                    key={index}
                    className={`p-2 rounded-md border ${
                      review.decision === "agree"
                        ? "bg-green-50 border-green-200"
                        : "bg-red-50 border-red-200"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {review.decision === "agree" ? (
                        <IoCheckmarkCircle className="w-3 h-3 text-green-600" />
                      ) : (
                        <IoCloseCircle className="w-3 h-3 text-red-600" />
                      )}
                      <span
                        className={`text-xs font-medium ${
                          review.decision === "agree"
                            ? "text-green-700"
                            : "text-red-700"
                        }`}
                      >
                        {review.decision === "agree"
                          ? "Approved"
                          : "Needs Revision"}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(review.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {review.comment && (
                      <p
                        className={`text-xs italic ${
                          review.decision === "agree"
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        "{review.comment}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="text-center p-3 bg-gray-50 rounded-lg border">
            <p className="text-xs text-gray-600">
              This annotation has been approved by a reviewer and cannot be
              edited or deleted.
            </p>
          </div>
        </div>
      </div>
    );
  }


  const handleDelete = () => {
    onDelete();
  };


  const modalContent = (
    <div
      className="edit-popup fixed bg-white border border-gray-200 rounded-lg shadow-xl p-4 z-50 min-w-[400px] max-w-[500px]"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: "translateX(-50%)",
      }}
    >
      {/* Close button */}
      <Button
        onClick={onCancel}
        disabled={isUpdatingAnnotation}
        variant="ghost"
        size="sm"
        className="absolute top-2 right-2 h-6 w-6 p-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <IoClose className="w-4 h-4" />
      </Button>

      <div className="mb-3 pr-8">

        {/* Current annotation text - derive from content to match document (fixes XML/TEI encoding issues) */}
        <div className="mb-3 p-2 bg-gray-50 rounded border">
          <p className="text-xs text-gray-500 mb-1">Selected text:</p>
          <p className="text-sm text-gray-700">
            "
            {(() => {
              const displayText =
                content &&
                annotation.start >= 0 &&
                annotation.end <= content.length
                  ? content.slice(annotation.start, annotation.end)
                  : annotation.text;
              const toShow =
                (displayText?.length ?? 0) > 100
                  ? (displayText ?? "").substring(0, 100) + "..."
                  : displayText ?? "";
              return toShow;
            })()}
            "
          </p>
        </div>

        {/* Reviewer Comments Section - Prominently displayed */}
        {annotation.reviews && annotation.reviews.length > 0 && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <IoChatbubbleEllipses className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">
                Reviewer Feedback
              </span>
            </div>
            <div className="max-h-32 overflow-y-auto space-y-2">
              {annotation.reviews.map((review, index) => (
                <div
                  key={index}
                  className={`p-2 rounded-md border ${
                    review.decision === "agree"
                      ? "bg-green-50 border-green-200"
                      : "bg-red-50 border-red-200"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {review.decision === "agree" ? (
                      <IoCheckmarkCircle className="w-3 h-3 text-green-600" />
                    ) : (
                      <IoCloseCircle className="w-3 h-3 text-red-600" />
                    )}
                    <span
                      className={`text-xs font-medium ${
                        review.decision === "agree"
                          ? "text-green-700"
                          : "text-red-700"
                      }`}
                    >
                      {review.decision === "agree"
                        ? "Approved"
                        : "Needs Revision"}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(review.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {review.comment && (
                    <p
                      className={`text-xs italic ${
                        review.decision === "agree"
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      "{review.comment}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      

        {/* Level Selection
        <div className="mb-3">
          <p className="text-xs text-gray-500 mb-2">
            Importance level (optional):
          </p>
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            disabled={isUpdatingAnnotation}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100"
          >
            <option value="">Select level...</option>
            <option value="minor">🟢 Minor</option>
            <option value="major">🟡 Major</option>
            <option value="critical">🔴 Critical</option>
          </select>
        </div> */}

     

        {/* Action Buttons */}
        <div className="flex gap-2 justify-between">
          <Button
            onClick={handleDelete}
            disabled={isUpdatingAnnotation}
            variant="destructive"
            size="sm"
            className="px-3 py-2 text-sm"
          >
            {isUpdatingAnnotation ? (
              <AiOutlineLoading3Quarters className="w-3 h-3 animate-spin mr-1" />
            ) : null}
            Delete
          </Button>

       
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
