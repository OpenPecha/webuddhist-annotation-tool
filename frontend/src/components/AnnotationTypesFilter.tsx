import { useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { IoChevronDown, IoChevronForward } from "react-icons/io5";
import {
  getDisplayLabelForFilter,
  getFilterKey,
  FILTER_KEY_SEP,
} from "@/utils/annotationConverter";
import { useAnnotationColors } from "@/hooks/use-annotation-colors";
import { useAnnotationTypes } from "@/hooks/useAnnotationTypes";
import type { AnnotationType } from "@/api/annotation_types";
import { annotationListApi } from "@/api/annotation_list";
import { queryKeys } from "@/constants/queryKeys";
import { extractLeafNodes } from "@/config/annotation-options";

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

type TypeRowModel = { name: string; dbRecord: AnnotationType | null };

type FilterRow = { key: string; label: string; count: number; disabled: boolean };

interface AnnotationTypesFilterProps {
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

export const AnnotationTypesFilter = (props: AnnotationTypesFilterProps) => {
  const {
    annotations,
    loading = false,
    selectedAnnotationTypes,
    onToggleAnnotationType,
  } = props;
  const { annotationTypeColors } = useAnnotationColors();
  const {
    data: dbAnnotationTypes = [],
    isLoading: dbTypesLoading,
    isError: dbTypesError,
  } = useAnnotationTypes({ limit: 1000 });
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());
  /** When true, list only annotation types / rows that appear in the current text */
  const [showOnlyUsedInText, setShowOnlyUsedInText] = useState(false);

  const toggleTypeExpanded = (typeName: string) => {
    setExpandedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(typeName)) next.delete(typeName);
      else next.add(typeName);
      return next;
    });
  };

  // Build filter keys (type|label) with counts, grouped by annotation type (from current text)
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

  const optsByTypeName = useMemo(() => {
    const m = new Map<string, FilterOption[]>();
    groupedByType.forEach(([name, opts]) => m.set(name, opts));
    return m;
  }, [groupedByType]);

  const countsByFilterKey = useMemo(() => {
    const m = new Map<string, number>();
    annotations.forEach((annotation) => {
      const key = getDisplayLabelForFilter(annotation);
      if (key) m.set(key, (m.get(key) || 0) + 1);
    });
    return m;
  }, [annotations]);

  const sortedDbTypes = useMemo(
    () => [...dbAnnotationTypes].sort((a, b) => a.name.localeCompare(b.name)),
    [dbAnnotationTypes]
  );

  const dbTypesWithIds = useMemo(
    () => sortedDbTypes.filter((t) => Boolean(t.id)),
    [sortedDbTypes]
  );

  const listQueries = useQueries({
    queries: dbTypesWithIds.map((at) => ({
      queryKey: queryKeys.annotationLists.byType(at.id),
      queryFn: () => annotationListApi.getByTypeHierarchical(at.id),
      enabled: Boolean(at.id),
      staleTime: 5 * 60 * 1000,
      retry: 2,
    })),
  });

  const listMetaByTypeId = useMemo(() => {
    const m = new Map<
      string,
      { leaves: ReturnType<typeof extractLeafNodes>; isLoading: boolean }
    >();
    dbTypesWithIds.forEach((at, i) => {
      const q = listQueries[i];
      const leaves =
        q.data?.categories && q.data.categories.length > 0
          ? extractLeafNodes(q.data.categories, 0)
          : [];
      m.set(at.id, { leaves, isLoading: q.isLoading });
    });
    return m;
  }, [dbTypesWithIds, listQueries]);

  /** All types to show: every DB type, then any type that appears in the text but not in DB */
  const typesToRender = useMemo((): TypeRowModel[] => {
    const fromDb: TypeRowModel[] = sortedDbTypes.map((at) => ({
      name: at.name,
      dbRecord: at,
    }));
    const seen = new Set(fromDb.map((r) => r.name));
    const fromTextOnly = groupedByType
      .map(([name]) => name)
      .filter((name) => !seen.has(name)&&name!=='line-break'&&name!=='page-break')
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({ name, dbRecord: null as AnnotationType | null }));
    
    const return_data=[...fromDb, ...fromTextOnly]
    return return_data.filter((r) => r.name!=='line-break'&&r.name!=='page-break');
  }, [sortedDbTypes, groupedByType]);

  const rowsByTypeName = useMemo(() => {
    const m = new Map<string, FilterRow[]>();
    for (const { name: typeName, dbRecord } of typesToRender) {
      const fromText = optsByTypeName.get(typeName) ?? [];

      if (dbRecord?.id) {
        const meta = listMetaByTypeId.get(dbRecord.id);
        if (meta?.isLoading) continue;

        const leaves = meta?.leaves ?? [];
        if (leaves.length === 0) {
          m.set(
            typeName,
            fromText.map((o) => ({
              key: o.key,
              label: o.label,
              count: o.count,
              disabled: false,
            }))
          );
          continue;
        }

        const seenKeys = new Set<string>();
        const rows: FilterRow[] = leaves.map((leaf) => {
          const key = getFilterKey(typeName, leaf.label);
          seenKeys.add(key);
          const count = countsByFilterKey.get(key) ?? 0;
          return {
            key,
            label: leaf.label,
            count,
            disabled: count === 0,
          };
        });
        for (const o of fromText) {
          if (!seenKeys.has(o.key)) {
            rows.push({
              key: o.key,
              label: o.label,
              count: o.count,
              disabled: false,
            });
            seenKeys.add(o.key);
          }
        }
        rows.sort((a, b) => {
          if (a.disabled !== b.disabled) return a.disabled ? 1 : -1;
          const aSel = selectedAnnotationTypes.has(a.key);
          const bSel = selectedAnnotationTypes.has(b.key);
          if (aSel !== bSel) return aSel ? -1 : 1;
          return a.label.localeCompare(b.label);
        });
        m.set(typeName, rows);
        continue;
      }

      m.set(
        typeName,
        fromText.map((o) => ({
          key: o.key,
          label: o.label,
          count: o.count,
          disabled: false,
        }))
      );
    }
    return m;
  }, [
    typesToRender,
    optsByTypeName,
    listMetaByTypeId,
    countsByFilterKey,
    selectedAnnotationTypes,
  ]);

  const swatchForType = (name: string, dbRecord: AnnotationType | null) =>
    dbRecord?.color?.trim() ||
    annotationTypeColors[name] ||
    DEFAULT_TYPE_COLOR;

  const typesVisibleInPanel = useMemo(() => {
    if (!showOnlyUsedInText) return typesToRender;
    return typesToRender.filter(({ name }) => {
      const opts = optsByTypeName.get(name) ?? [];
      if(name==='line-break'||name==='page-break') return false;
      return opts.reduce((s, o) => s + o.count, 0) > 0;
    });
  }, [showOnlyUsedInText, typesToRender, optsByTypeName]);
 console.log(typesVisibleInPanel)
  return (
    <div className="mb-3 h-full border bg-white border-gray-300 rounded overflow-auto">
      <div className="flex flex-col gap-0">
        <div
          className="w-full px-3 py-2 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors rounded text-left"
        >
          <span className="text-xs font-medium text-gray-700">
            Filter by Annotations
          </span>
        
        </div>
        <div className="px-3 pb-2 flex items-center gap-2 border-b border-gray-100 bg-gray-50">
          <input
            type="checkbox"
            id="filter-only-used-in-text"
            checked={showOnlyUsedInText}
            onChange={(e) => setShowOnlyUsedInText(e.target.checked)}
            className="w-3.5 h-3.5 text-orange-500 border-gray-300 rounded focus:ring-orange-400 focus:ring-1 cursor-pointer flex-shrink-0"
          />
          <label
            htmlFor="filter-only-used-in-text"
            className="text-xs text-gray-600 cursor-pointer select-none"
          >
            Only show types used in this text
          </label>
        </div>
      </div>

        <div className="p-3 border-t border-gray-300">
          {dbTypesLoading ? (
            <div className="flex items-center gap-2 py-2">
              <span className="inline-block w-4 h-4 animate-spin rounded-full border-2 border-orange-400 border-t-transparent" />
              <p className="text-xs text-gray-500">Loading types…</p>
            </div>
          ) : dbTypesError ? (
            <p className="text-xs text-red-600">
              Could not load annotation types from the server.
            </p>
          ) : typesToRender.length === 0 ? (
            <p className="text-xs text-gray-500">
              No annotation types registered in the database
            </p>
          ) : loading ? (
            <div className="flex items-center gap-2 py-2">
              <span className="inline-block w-4 h-4 animate-spin rounded-full border-2 border-orange-400 border-t-transparent" />
              <p className="text-xs text-gray-500">Updating…</p>
            </div>
          ) : showOnlyUsedInText && typesVisibleInPanel.length === 0 ? (
            <p className="text-xs text-gray-500">
              No annotations in this text match the filter.
            </p>
          ) : (
            <div className="h-full overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              {typesVisibleInPanel.map(({ name: typeName, dbRecord }) => {
                const opts = optsByTypeName.get(typeName) ?? [];
                const instancesInText = opts.reduce((s, o) => s + o.count, 0);
                const isExpanded = expandedTypes.has(typeName);
                const typeListId = dbRecord?.id;
                const listLoading = typeListId
                  ? (listMetaByTypeId.get(typeListId)?.isLoading ?? false)
                  : false;
                const rows = rowsByTypeName.get(typeName);
                const displayRows =
                  showOnlyUsedInText && rows
                    ? rows.filter((r) => r.count > 0)
                    : rows;
                return (
                  <div
                    key={typeName}
                    className="border border-gray-200 rounded overflow-hidden"
                  >
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
                      <div className="flex-1 uppercase text-xs font-semibold text-gray-700 py-1.5 pr-2 flex items-center justify-between gap-2 min-w-0">
                        <span className="flex items-center gap-1.5 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded flex-shrink-0 border border-gray-300"
                            style={{
                              backgroundColor: swatchForType(typeName, dbRecord),
                            }}
                            title={`Color for ${typeName}`}
                            aria-hidden
                          />
                          <span className="truncate">{typeName}</span>
                        </span>
                        <span className="text-gray-500 font-normal normal-case flex-shrink-0">
                          {instancesInText > 0 ? instancesInText : "—"}
                        </span>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="bg-white space-y-0.5 p-1">
                        {listLoading ? (
                          <p className="text-xs text-gray-500 px-2 py-2 ml-1">
                            Loading options…
                          </p>
                        ) : !displayRows || displayRows.length === 0 ? (
                          <p className="text-xs text-gray-500 px-2 py-2 ml-1">
                            No annotation options for this type
                          </p>
                        ) : (
                          displayRows.map(({ key, label, count, disabled }) => (
                            <div
                              key={key}
                              className={`flex items-start gap-2 p-2 rounded transition-colors ml-1 ${
                                disabled ? "opacity-60" : "hover:bg-gray-50"
                              }`}
                            >
                              <input
                                type="checkbox"
                                id={`annotation-type-${key}`}
                                checked={selectedAnnotationTypes.has(key)}
                                disabled={disabled}
                                onChange={() => {
                                  if (!disabled) onToggleAnnotationType(key);
                                }}
                                className="w-3.5 h-3.5 text-orange-500 border-gray-300 rounded focus:ring-orange-400 focus:ring-1 mt-0.5 flex-shrink-0 enabled:cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                              />
                              <label
                                htmlFor={`annotation-type-${key}`}
                                title={
                                  disabled
                                    ? "Not used in the current text"
                                    : undefined
                                }
                                className={`flex-1 flex items-center justify-between ${
                                  disabled
                                    ? "cursor-not-allowed"
                                    : "cursor-pointer"
                                }`}
                              >
                                <div
                                  className={`text-xs font-medium ${
                                    disabled ? "text-gray-500" : "text-gray-900"
                                  }`}
                                >
                                  {label}
                                </div>
                                <span className="text-xs text-gray-500 ml-2">
                                  {`[${count}]`}
                                </span>
                              </label>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
    </div>
  );
};
