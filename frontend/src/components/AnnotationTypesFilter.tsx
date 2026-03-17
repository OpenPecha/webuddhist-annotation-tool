import { useMemo, useState } from "react";
import { IoChevronDown, IoChevronForward } from "react-icons/io5";
import { getDisplayLabelForFilter, FILTER_KEY_SEP } from "@/utils/annotationConverter";
import { useAnnotationColors } from "@/hooks/use-annotation-colors";

const DEFAULT_TYPE_COLOR = "#6b7280";

/** Annotation shape from API (annotation_type) or UI (type) */
type AnnotationForFilter = {
  type?: string;
  annotation_type?: string;
  label?: string | null;
  name?: string | null;
};

/** Filter option: key is type|label, displayLabel is the label part for showing under a type group */
type FilterOption = { key: string; typeName: string; label: string; count: number };

interface AnnotationTypesFilterProps {
  isOpen: boolean;
  onToggle: () => void;
  /** Annotations from API or UI; filter options are derived and grouped by annotation type */
  annotations: AnnotationForFilter[];
  loading?: boolean;
  selectedAnnotationTypes: Set<string>;
  onToggleAnnotationType: (filterKey: string) => void;
  onSelectAllAnnotationTypes: (filterKeys: string[]) => void;
  onDeselectAllAnnotationTypes: () => void;
  /** Set selection to exactly these keys (e.g. "show only this type") */
  onSetSelectedAnnotationTypes?: (filterKeys: Set<string>) => void;
}

export const AnnotationTypesFilter = ({
  isOpen,
  onToggle,
  annotations,
  loading = false,
  selectedAnnotationTypes,
  onToggleAnnotationType,
  onSelectAllAnnotationTypes,
  onDeselectAllAnnotationTypes,
  onSetSelectedAnnotationTypes,
}: AnnotationTypesFilterProps) => {
  const { annotationTypeColors } = useAnnotationColors();
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());

  const toggleTypeExpanded = (typeName: string) => {
    setExpandedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(typeName)) next.delete(typeName);
      else next.add(typeName);
      return next;
    });
  };

  // Build filter keys (type|label) with counts, grouped by annotation type
  const groupedByType = useMemo(() => {
    const counts = new Map<string, number>();
    annotations.forEach((annotation) => {
      const key = getDisplayLabelForFilter(annotation);
      if (key) counts.set(key, (counts.get(key) || 0) + 1);
    });
    const options: FilterOption[] = Array.from(counts.entries()).map(
      ([key, count]) => {
        const idx = key.indexOf(FILTER_KEY_SEP);
        const typeName = idx >= 0 ? key.slice(0, idx) : key;
        const label = idx >= 0 ? key.slice(idx + 1) : key;
        return { key, typeName, label, count };
      }
    );
    const byType = new Map<string, FilterOption[]>();
    options.forEach((opt) => {
      const list = byType.get(opt.typeName) || [];
      list.push(opt);
      byType.set(opt.typeName, list);
    });
    byType.forEach((list) =>
      list.sort((a, b) => {
        const aSel = selectedAnnotationTypes.has(a.key);
        const bSel = selectedAnnotationTypes.has(b.key);
        if (aSel !== bSel) return aSel ? -1 : 1;
        return a.label.localeCompare(b.label);
      })
    );
    return Array.from(byType.entries()).sort((a, b) =>
      a[0].localeCompare(b[0])
    );
  }, [annotations, selectedAnnotationTypes]);

  const allKeys = useMemo(
    () => groupedByType.flatMap(([, opts]) => opts.map((o) => o.key)),
    [groupedByType]
  );

  const handleToggleAll = () => {
    if (selectedAnnotationTypes.size === allKeys.length && allKeys.length > 0) {
      onDeselectAllAnnotationTypes();
    } else {
      onSelectAllAnnotationTypes(allKeys);
    }
  };

  const keysForType = (opts: FilterOption[]) => opts.map((o) => o.key);
  /** True when all keys of this type are in the selection (allows other types to be selected too) */
  const isTypeFullySelected = (opts: FilterOption[]) => {
    const keys = keysForType(opts);
    if (keys.length === 0) return false;
    return keys.every((k) => selectedAnnotationTypes.has(k));
  };
  /** Toggle whole type: add all keys of this type to selection, or remove all (multi-select friendly) */
  const handleTypeCheckboxChange = (opts: FilterOption[]) => {
    const keys = keysForType(opts);
    if (keys.length === 0) return;
    const fullySelected = isTypeFullySelected(opts);
    const next = new Set(selectedAnnotationTypes);
    if (fullySelected) {
      keys.forEach((k) => next.delete(k));
    } else {
      keys.forEach((k) => next.add(k));
    }
    if (onSetSelectedAnnotationTypes) {
      onSetSelectedAnnotationTypes(next);
      return;
    }
    onDeselectAllAnnotationTypes();
    if (next.size > 0) onSelectAllAnnotationTypes(Array.from(next));
  };

  return (
    <div className="mb-3 flex-shrink-0 border border-gray-300 rounded">
      <button
        onClick={onToggle}
        className="w-full px-3 py-2 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors rounded"
      >
        <span className="text-xs font-medium text-gray-700">
          Filter by Annotations
        </span>
        {isOpen ? (
          <IoChevronDown className="w-4 h-4 text-gray-500" />
        ) : (
          <IoChevronForward className="w-4 h-4 text-gray-500" />
        )}
      </button>

      {isOpen && (
        <div className="p-3 border-t border-gray-300 bg-white">
          {loading ? (
            <div className="flex items-center gap-2 py-2">
              <span className="inline-block w-4 h-4 animate-spin rounded-full border-2 border-orange-400 border-t-transparent" />
              <p className="text-xs text-gray-500">Updating...</p>
            </div>
          ) : allKeys.length === 0 ? (
            <p className="text-xs text-gray-500">No annotation types available</p>
          ) : (
            <div className="space-y-2">
              {/* Select All / Deselect All */}
              {/* <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                <input
                  type="checkbox"
                  id="select-all-annotation-types"
                  checked={selectedAnnotationTypes.size === allKeys.length && allKeys.length > 0}
                  onChange={handleToggleAll}
                  className="w-3.5 h-3.5 text-orange-500 border-gray-300 rounded focus:ring-orange-400 focus:ring-1 cursor-pointer"
                />
                <label
                  htmlFor="select-all-annotation-types"
                  className="flex-1 cursor-pointer flex items-center justify-between"
                >
                  <div className="text-xs font-medium text-gray-700">
                  {selectedAnnotationTypes.size === allKeys.length && allKeys.length > 0
                      ? "Deselect All"
                      : "Select All"}</div>
                  <span className="text-xs text-gray-500 mr-3">[{annotations.length}]</span>
                </label>
              </div> */}

              {/* Annotation list grouped by annotation type (collapsible, show-only-this-type) */}
              <div className="max-h-60 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                {groupedByType.map(([typeName, opts]) => {
                  const isExpanded = expandedTypes.has(typeName);
                  const typeFullySelected = isTypeFullySelected(opts);
                  return (
                    <div key={typeName} className="border border-gray-200 rounded overflow-hidden">
                      <div className="flex items-center gap-1 bg-gray-50 border-b border-gray-200 min-h-8">
                        <button
                          type="button"
                          onClick={() => toggleTypeExpanded(typeName)}
                          className="p-1.5 text-gray-600 hover:bg-gray-100 rounded flex-shrink-0"
                          aria-expanded={isExpanded}
                          title={isExpanded ? "Collapse" : "Expand"}
                        >
                          {isExpanded ? (
                            <IoChevronDown className="w-3.5 h-3.5" />
                          ) : (
                            <IoChevronForward className="w-3.5 h-3.5" />
                          )}
                        </button>
                     
                        <label
                          htmlFor={`filter-type-${typeName}`}
                          className="flex-1 uppercase text-xs font-semibold text-gray-700 cursor-pointer py-1.5 pr-2 flex items-center justify-between gap-2"
                        >
                          <span className="flex items-center gap-1.5 min-w-0">
                            <span
                              className="w-2.5 h-2.5 rounded flex-shrink-0 border border-gray-300"
                              style={{
                                backgroundColor:
                                  annotationTypeColors[typeName] ?? DEFAULT_TYPE_COLOR,
                              }}
                              title={`Color for ${typeName}`}
                              aria-hidden
                            />
                            <span className="truncate">{typeName}</span>
                          </span>
                          <span className="text-gray-500 font-normal flex-shrink-0">
                            {opts.reduce((s, o) => s + o.count, 0)}
                          </span>
                        </label>
                      </div>
                      {isExpanded && (
                        <div className="bg-white space-y-0.5 p-1">
                          {opts.map(({ key, label, count }) => (
                            <div
                              key={key}
                              className="flex items-start gap-2 p-2 hover:bg-gray-50 rounded transition-colors ml-1"
                            >
                              <input
                                type="checkbox"
                                id={`annotation-type-${key}`}
                                checked={selectedAnnotationTypes.has(key)}
                                onChange={() => onToggleAnnotationType(key)}
                                className="w-3.5 h-3.5 text-orange-500 border-gray-300 rounded focus:ring-orange-400 focus:ring-1 cursor-pointer mt-0.5 flex-shrink-0"
                              />
                              <label
                                htmlFor={`annotation-type-${key}`}
                                className="flex-1 cursor-pointer flex items-center justify-between"
                              >
                                <div className="text-xs font-medium text-gray-900">
                                  {label}
                                </div>
                                <span className="text-xs text-gray-500 ml-2">
                                  {`[${count}]`}
                                </span>
                              </label>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

