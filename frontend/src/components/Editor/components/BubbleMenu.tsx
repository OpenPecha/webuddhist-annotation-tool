import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { IoClose, IoSearch, IoAdd } from "react-icons/io5";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import type { BubbleMenuProps } from "../types";
import { useAuth } from "@/auth/use-auth-hook";
import {
  STRUCTURAL_ANNOTATION_TYPES,
  isStructuralAnnotationType,
  type StructuralAnnotationType,
} from "@/config/structural-annotations";
import { useAnnotationStore } from "@/store/annotation";
import type { CategoryOutput } from "@/api/annotation_list";
import type { AnnotationType } from "@/api/annotation_types";
import { useAnnotationListHierarchical, useAnnotationTypes } from "@/hooks/";
import { useAnnotationFiltersStore } from "@/store/annotationFilters";
import { useCustomAnnotationsStore } from "@/store/customAnnotations";

// Type definitions for error typology (using API types)
interface ErrorCategory extends CategoryOutput {
  id?: string;
  name: string;
  mnemonic?: string;
  description?: string;
  examples?: string[];
  notes?: string;
  level?: number;
  parent?: string;
  subcategories?: ErrorCategory[];
}

interface CategoryWithBreadcrumb extends ErrorCategory {
  breadcrumb: string;
}

export const BubbleMenu: React.FC<BubbleMenuProps> = ({
  visible,
  position,
  currentSelection,
  annotationLevel,
  isCreatingAnnotation,

  contextAnnotation,
  onAddAnnotation,
  onCancel,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBubbleAnnotationType, setSelectedBubbleAnnotationType] =
    useState<AnnotationType | null>(null);
  const [selectedErrorCategory, setSelectedErrorCategory] =
    useState<CategoryWithBreadcrumb | null>(null);
  const [selectedStructuralType, setSelectedStructuralType] =
    useState<StructuralAnnotationType | null>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<string>("");
  const [customInput, setCustomInput] = useState("");
  const { currentUser } = useAuth();
  const {
    getCustomOptions,
    addCustomAnnotation,
    customOptionsByListType,
  } = useCustomAnnotationsStore();

  // Get annotation mode from Zustand store
  const { currentNavigationMode: annotationMode } = useAnnotationStore();
  const { selectedAnnotationListType } = useAnnotationFiltersStore();
  const { data: annotationTypes = [] } = useAnnotationTypes();

  // Determine the effective annotation mode based on context
  const getEffectiveAnnotationMode = (): "error-list" | "table-of-contents" => {
    // If we have a context annotation (editing existing annotation),
    // determine mode based on its type
    if (contextAnnotation) {
      return isStructuralAnnotationType(contextAnnotation.type)
        ? "table-of-contents"
        : "error-list";
    }

    // Otherwise use the passed annotation mode (from NavigationModeSelector)
    return annotationMode;
  };

  const effectiveMode = getEffectiveAnnotationMode();

  // Load annotation list only after user selects an annotation type in the bubble (error-list mode)
  const typeIdForList =
    effectiveMode === "error-list" && selectedBubbleAnnotationType
      ? selectedBubbleAnnotationType.id
      : "";
  const {
    data: errorData,
    isLoading: loading,
    error,
  } = useAnnotationListHierarchical({
    type_id: typeIdForList,
    enabled: effectiveMode === "error-list" && !!typeIdForList,
  });

  // Reset selected items when mode or context changes, but preserve level selection
  useEffect(() => {
    setSelectedBubbleAnnotationType(null);
    setSelectedErrorCategory(null);
    setSelectedStructuralType(null);
    setSearchQuery("");
    setIsSearchFocused(false);
    setSelectedLevel("");
  }, [annotationMode, contextAnnotation, selectedAnnotationListType]);

  // Reset selected items when text selection changes (but preserve level)
  useEffect(() => {
    setSelectedBubbleAnnotationType(null);
    setSelectedErrorCategory(null);
    setSelectedStructuralType(null);
    setSearchQuery("");
    setIsSearchFocused(false);
  }, [currentSelection]);

  // Helper function to flatten error categories
  const flattenCategories = (
    categories: ErrorCategory[],
    result: ErrorCategory[] = []
  ): ErrorCategory[] => {
    for (const category of categories) {
      result.push(category);
      if (category.subcategories) {
        flattenCategories(category.subcategories, result);
      }
    }
    return result;
  };

  // Helper function to get innermost categories
  const getInnermostCategories = (
    categories: ErrorCategory[]
  ): ErrorCategory[] => {
    const allCategories = flattenCategories(categories);
    return allCategories.filter(
      (cat) => !cat.subcategories || cat.subcategories.length === 0
    );
  };

  // Helper function to build breadcrumb
  const buildBreadcrumb = (category: ErrorCategory): string => {
    if (!errorData?.categories) return category.name;

    const allCategories = flattenCategories(
      errorData.categories
    );
    const breadcrumbParts: string[] = [category.name];
    let current = category;

    while (current.parent) {
      const parent = allCategories.find((cat) => cat.id === current.parent);
      if (parent) {
        breadcrumbParts.unshift(parent.name);
        current = parent;
      } else {
        break;
      }
    }

    return breadcrumbParts.join(" > ");
  };

  const customErrorOptions = useMemo((): CategoryWithBreadcrumb[] => {
    const listTypeId = selectedBubbleAnnotationType?.id || selectedAnnotationListType;
    if (!listTypeId || effectiveMode !== "error-list") return [];
    const opts = getCustomOptions(listTypeId);
    return opts.map((o) => ({
      id: o.id,
      name: o.label,
      breadcrumb: o.label,
      mnemonic: "",
      level: 0,
    }));
  }, [selectedBubbleAnnotationType?.id, selectedAnnotationListType, effectiveMode, customOptionsByListType]);

  // Step 1 in error-list: show annotation types. Step 2: show categories for selected type.
  const filteredAnnotationTypes = useMemo(() => {
    if (effectiveMode !== "error-list" || annotationTypes.length === 0) return [];
    if (!searchQuery.trim()) return annotationTypes;
    const query = searchQuery.toLowerCase();
    return annotationTypes.filter((t) =>
      t.name.toLowerCase().includes(query)
    );
  }, [effectiveMode, annotationTypes, searchQuery]);

  // Filter items based on mode (categories only when type already selected in error-list)
  const filteredItems = useMemo((): (StructuralAnnotationType | CategoryWithBreadcrumb | AnnotationType)[] => {
    if (effectiveMode === "table-of-contents") {
      if (!searchQuery.trim()) return STRUCTURAL_ANNOTATION_TYPES;
      const query = searchQuery.toLowerCase();
      return STRUCTURAL_ANNOTATION_TYPES.filter(
        (type) =>
          type.name.toLowerCase().includes(query) ||
          type.description.toLowerCase().includes(query) ||
          (type.examples &&
            type.examples.some((ex) => ex.toLowerCase().includes(query)))
      );
    }
    if (effectiveMode === "error-list" && !selectedBubbleAnnotationType) {
      return filteredAnnotationTypes;
    }
    // Error-list with type selected: show categories for that type
    const innermostCategories = errorData?.categories
      ? getInnermostCategories(errorData.categories)
      : [];
    const apiItems = innermostCategories.map((category) => ({
      ...category,
      breadcrumb: buildBreadcrumb(category),
    }));
    let items: CategoryWithBreadcrumb[] = [...apiItems, ...customErrorOptions];
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      items = items.filter(
        (cat) =>
          cat.name.toLowerCase().includes(query) ||
          cat.description?.toLowerCase().includes(query) ||
          cat.mnemonic?.toLowerCase().includes(query) ||
          (cat.examples &&
            cat.examples.some((ex) =>
              typeof ex === "string" ? ex.toLowerCase().includes(query) : false
            ))
      );
    }
    return items;
  }, [errorData, searchQuery, effectiveMode, customErrorOptions, selectedBubbleAnnotationType, filteredAnnotationTypes]);

  if (!visible || !currentSelection) return null;

  const handleAddAnnotation = () => {
    if (!currentSelection) return;
    if (effectiveMode === "table-of-contents" && selectedStructuralType) {
      onAddAnnotation(
        selectedStructuralType.id,
        undefined,
        annotationLevel || undefined
      );
    } else if (
      effectiveMode === "error-list" &&
      selectedBubbleAnnotationType &&
      selectedErrorCategory
    ) {
      onAddAnnotation(
        selectedBubbleAnnotationType.name,
        selectedErrorCategory.name,
        selectedLevel || undefined
      );
    }
  };

  const handleSearchFocus = () => {
    setIsSearchFocused(true);
  
  };

  const handleSearchBlur = () => {
    // Delay hiding to allow dropdown clicks
    setTimeout(() => {
      setIsSearchFocused(false);
   
    }, 200);
  };

  const handleCancel = () => {
    onCancel();
  };

  const searchPlaceholder =
    effectiveMode === "table-of-contents"
      ? "Search structural types..."
      : "Search categories...";

  const canSubmit =
    effectiveMode === "table-of-contents"
      ? selectedStructuralType !== null
      : selectedBubbleAnnotationType !== null && selectedErrorCategory !== null;

  const modalContent = (
    <div
      className="fixed bg-white border border-gray-200 rounded-lg shadow-xl p-4 z-50 w-[380px] max-w-[90vw] overflow-hidden"
      style={{
        left: `max(${position.x}px, 5vw)`,
        right: `max(calc(100vw - ${position.x}px), 5vw)`,
        top: `${position.y}px`,
        transform: `translateX(${position.transformX})`,
      }}
    >
      {/* Close button */}
      <Button
        onClick={handleCancel}
        disabled={isCreatingAnnotation}
        variant="ghost"
        size="sm"
        className="absolute top-2 right-2 h-6 w-6 p-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
      >
        <IoClose className="w-4 h-4" />
      </Button>

      <div className="mb-3 pr-8 overflow-hidden">
        {isCreatingAnnotation ? (
          <div className="text-xs text-blue-600 mb-3 flex items-center gap-2">
            <AiOutlineLoading3Quarters className="w-3 h-3 animate-spin" />
            <span className="font-medium">Creating annotation...</span>
          </div>
        ) : (
          <p className="text-xs text-gray-500 mb-3">
            {effectiveMode === "table-of-contents"
              ? "Choose structural type:"
              : selectedBubbleAnnotationType
                ? `Choose annotation for ${selectedBubbleAnnotationType.name}:`
                : "Choose annotation type:"}
          </p>
        )}

        {/* Back button when annotation type is selected (error-list step 2) */}
        {effectiveMode === "error-list" && selectedBubbleAnnotationType && !selectedErrorCategory && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mb-2 text-xs text-gray-600 hover:text-gray-900"
            onClick={() => {
              setSelectedBubbleAnnotationType(null);
              setSearchQuery("");
            }}
          >
            ← Back to annotation types
          </Button>
        )}

        {/* Search box - only show for error-list mode or if no error selected */}
        {!isCreatingAnnotation &&
          (annotationMode === "table-of-contents" ||
            !selectedErrorCategory) && (
            <div className="mb-3">
              <div className="relative">
                <IoSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400 flex-shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={handleSearchFocus}
                  onBlur={handleSearchBlur}
                  placeholder={searchPlaceholder}
                  autoComplete="off"
                  className={`w-full pl-7 pr-8 py-1.5 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-orange-400 focus:border-transparent min-w-0 ${
                    searchQuery.trim() || isSearchFocused
                      ? "border-orange-300 bg-orange-50"
                      : "border-gray-300"
                  }`}
                />
                {(searchQuery || isSearchFocused) && (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setIsSearchFocused(false);
                    }}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400 hover:text-gray-600"
                  >
                    <IoClose className="w-3 h-3" />
                  </button>
                )}
              </div>
              {(searchQuery || isSearchFocused) &&
                annotationMode === "error-list" && (
                  <p className="text-xs text-gray-500 mt-1">
                    {searchQuery
                      ? `${filteredItems.length}  found`
                      : `${filteredItems.length} total `}
                  </p>
                )}
              {/* Add your own annotation - error-list mode */}
              {effectiveMode === "error-list" && selectedBubbleAnnotationType && !isCreatingAnnotation && (
                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    placeholder="Can't find it? Add your own..."
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    autoComplete="off"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const trimmed = customInput.trim();
                        const listTypeId = selectedBubbleAnnotationType?.id;
                        if (trimmed && listTypeId) {
                          addCustomAnnotation(listTypeId, trimmed);
                          const customItem: CategoryWithBreadcrumb = {
                            id: `custom-${trimmed.toLowerCase().replaceAll(/\s+/g, "-")}`,
                            name: trimmed,
                            breadcrumb: trimmed,
                            mnemonic: "",
                            level: 0,
                          };
                          setSelectedErrorCategory(customItem);
                          setCustomInput("");
                          setSearchQuery("");
                        }
                      }
                    }}
                    className="flex-1 px-3 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-orange-400 focus:border-transparent"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={
                      !customInput.trim() || !selectedBubbleAnnotationType?.id
                    }
                    onClick={() => {
                      const trimmed = customInput.trim();
                      const listTypeId = selectedBubbleAnnotationType?.id;
                      if (trimmed && listTypeId) {
                        addCustomAnnotation(listTypeId, trimmed);
                        const customItem: CategoryWithBreadcrumb = {
                          id: `custom-${trimmed.toLowerCase().replaceAll(/\s+/g, "-")}`,
                          name: trimmed,
                          breadcrumb: trimmed,
                          mnemonic: "",
                          level: 0,
                        };
                        setSelectedErrorCategory(customItem);
                        setCustomInput("");
                        setSearchQuery("");
                      }
                    }}
                    className="shrink-0 px-2 py-1.5 text-xs"
                  >
                    <IoAdd className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>
          )}

        {/* Selected Error Display - for error-list mode */}
        {effectiveMode === "error-list" && selectedErrorCategory && (
          <div className="mb-3 p-3 bg-orange-50 border border-orange-200 rounded-md">
            <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-orange-900">
              {selectedErrorCategory.name}
            </div>
              <button
                onClick={() => {
                  setSelectedErrorCategory(null);
                  setSelectedLevel("");
                }}
                className="text-gray-400 hover:text-gray-600"
                title="Clear selection"
              >
                <IoClose className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

      

        {/* Loading/error states - only when loading list for selected type */}
        {loading && effectiveMode === "error-list" && selectedBubbleAnnotationType && (
          <div className="text-center py-4">
            <AiOutlineLoading3Quarters className="w-4 h-4 animate-spin mx-auto mb-2 text-gray-400" />
            <p className="text-xs text-gray-500">Loading annotations...</p>
          </div>
        )}

        {error && effectiveMode === "error-list" && selectedBubbleAnnotationType && (
          <div className="text-center py-4">
            <p className="text-xs text-red-500">
              {error instanceof Error ? error.message : "Failed to load list"}
            </p>
          </div>
        )}

        {/* Items list: structural types, annotation types (step 1), or categories (step 2) */}
        {!loading &&
          !error &&
          !selectedErrorCategory &&
          !selectedStructuralType &&
          (effectiveMode !== "error-list" || !selectedBubbleAnnotationType || errorData) && (
          <div className="max-h-60 overflow-y-auto overflow-x-hidden ">
            <div className="space-y-1">
              {filteredItems.slice(0, 20).map((item) => {
                const isStructural = effectiveMode === "table-of-contents";
                const isAnnotationType =
                  effectiveMode === "error-list" && !selectedBubbleAnnotationType;

                const itemId: string = isStructural
                  ? (item as StructuralAnnotationType).id
                  : isAnnotationType
                    ? (item as AnnotationType).id
                    : (item as CategoryWithBreadcrumb).id ?? "";
                const isSelected = false;

                return (
                  <Button
                    key={itemId}
                    onClick={() => {
                      if (isStructural) {
                        setSelectedStructuralType(
                          item as StructuralAnnotationType
                        );
                      } else if (isAnnotationType) {
                        setSelectedBubbleAnnotationType(item as AnnotationType);
                        setSearchQuery("");
                      } else {
                        setSelectedErrorCategory(
                          item as CategoryWithBreadcrumb
                        );
                        setSearchQuery("");
                      }
                    }}
                    disabled={isCreatingAnnotation}
                    variant="ghost"
                    className={`w-full uppercase h-auto p-2 justify-start text-left transition-all duration-200 border-l-2 ${
                      isSelected
                        ? "border-orange-400 bg-orange-50 text-orange-900"
                        : "border-transparent hover:border-orange-200 hover:bg-orange-25"
                    }`}
                  >
                    <div className="w-full overflow-hidden">
                      <div className="flex-1 min-w-0 space-y-1">
                        {isStructural ? (
                            <div className="flex items-center gap-2 min-w-0">
                              {(item as StructuralAnnotationType).icon && (
                                <span className="text-sm flex-shrink-0">
                                  {(item as StructuralAnnotationType).icon}
                                </span>
                              )}
                              <div className="text-sm font-medium truncate min-w-0 flex-1">
                                {item.name}
                              </div>
                            </div>
                          
                        ) : isAnnotationType ? (
                          <div className="text-sm font-medium truncate">
                            {(item as AnnotationType).name}
                          </div>
                        ) : (
                            <div className="text-sm font-medium truncate">
                              {item.name}
                            </div>
                        )}
                      </div>
                    </div>
                  </Button>
                );
              })}

              {filteredItems.length === 0 && (
                <p className="text-xs text-gray-500 italic px-3 py-4 text-center">
                  No items found matching your search.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Add Annotation Button - for error-list mode when error is selected */}
        {effectiveMode === "error-list" &&
          selectedErrorCategory &&
          !isCreatingAnnotation && (
            <div className="mb-3">
              <Button
                onClick={handleAddAnnotation}
                disabled={isCreatingAnnotation}
                className="w-full px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-md text-sm font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreatingAnnotation ? (
                  <div className="flex items-center justify-center gap-2">
                    <AiOutlineLoading3Quarters className="w-4 h-4 animate-spin" />
                    Creating annotation...
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <span>Add Annotation</span>
                    <span className="text-xs opacity-75">
                      ({selectedErrorCategory.mnemonic}
                    </span>
                  </div>
                )}
              </Button>
            </div>
          )}

        {/* Action buttons - for TOC mode */}
        {effectiveMode === "table-of-contents" && !isCreatingAnnotation && (
          <div className="flex gap-2 pt-3 border-t">
            <Button
              onClick={handleCancel}
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddAnnotation}
              disabled={!canSubmit}
              size="sm"
              className="flex-1 text-xs bg-orange-500 hover:bg-orange-600"
            >
              {isCreatingAnnotation ? (
                <AiOutlineLoading3Quarters className="w-3 h-3 animate-spin" />
              ) : (
                "Add"
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
