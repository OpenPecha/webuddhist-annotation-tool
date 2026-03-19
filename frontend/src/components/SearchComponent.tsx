import React, { useState, useEffect, useRef, startTransition } from "react";
import { Button } from "@/components/ui/button";
import { IoSearch, IoChevronUp, IoChevronDown } from "react-icons/io5";
import { AnnotationTypesFilter } from "./AnnotationTypesFilter";
import { useAnnotationsByText } from "@/hooks";
import { useAnnotationFiltersStore } from "@/store/annotationFilters";

interface SearchResult {
  index: number;
  start: number;
  end: number;
  line: number;
  preview: string;
}

interface SearchComponentProps {
  text: string;
  isVisible: boolean;
  onClose: () => void;
  onResultSelect: (start: number, end: number) => void;
  textId?: number;
}

export const SearchComponent: React.FC<SearchComponentProps> = ({
  text,
  isVisible,
  onClose,
  onResultSelect,
  textId,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [currentResultIndex, setCurrentResultIndex] = useState(0);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [isLeafFilterOpen, setIsLeafFilterOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Get state from store
  const { 
    selectedAnnotationTypes,
    setSelectedAnnotationTypes,
  } = useAnnotationFiltersStore();

  // Fetch Annotations by text if textId is provided
  const {
    data: annotationsByText = [],
    isLoading: loadingLeaves,
  } = useAnnotationsByText(
    textId || 0,
    !!textId && !Number.isNaN(textId)
  );

  // Toggle annotation type selection (startTransition avoids UI hang with many annotations)
  const toggleAnnotationTypeSelection = (displayLabel: string) => {
    startTransition(() => {
      const newSet = new Set(selectedAnnotationTypes);
      if (newSet.has(displayLabel)) {
        newSet.delete(displayLabel);
      } else {
        newSet.add(displayLabel);
      }
      setSelectedAnnotationTypes(newSet);
    });
  };

  // Focus search input when component becomes visible
  useEffect(() => {
    if (isVisible && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isVisible]);

  // Perform search when search term or options change
  useEffect(() => {
    if (searchTerm.trim()) {
      performSearch(searchTerm);
    } else {
      setSearchResults([]);
      setCurrentResultIndex(0);
    }
  }, [searchTerm, caseSensitive, wholeWord, text]);

  // Helper function to escape special regex characters
  const escapeRegExp = (string: string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  };

  const performSearch = (term: string) => {
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }

    const results: SearchResult[] = [];
    const lines = text.split("\n");
    let globalIndex = 0;

    // Create regex pattern based on options
    let pattern = escapeRegExp(term);
    if (wholeWord) {
      pattern = `\\b${pattern}\\b`;
    }

    const flags = caseSensitive ? "g" : "gi";
    const regex = new RegExp(pattern, flags);

    lines.forEach((line, lineIndex) => {
      let match;
      const lineStartIndex = globalIndex;

      while ((match = regex.exec(line)) !== null) {
        const start = lineStartIndex + match.index;
        const end = start + match[0].length;

        // Create preview with context
        const previewStart = Math.max(0, match.index - 20);
        const previewEnd = Math.min(
          line.length,
          match.index + match[0].length + 20
        );
        const preview = `${previewStart > 0 ? "..." : ""}${line.substring(
          previewStart,
          previewEnd
        )}${previewEnd < line.length ? "..." : ""}`;

        results.push({
          index: results.length,
          start,
          end,
          line: lineIndex + 1,
          preview,
        });

        // Prevent infinite loop for zero-length matches
        if (match[0].length === 0) {
          regex.lastIndex++;
        }
      }

      globalIndex += line.length + 1; // +1 for the newline character
    });

    setSearchResults(results);
    setCurrentResultIndex(0);
  };

  const handleResultClick = (result: SearchResult) => {
    onResultSelect(result.start, result.end);
    setCurrentResultIndex(result.index);
  };

  const navigateToResult = (direction: "next" | "prev") => {
    if (searchResults.length === 0) return;

    let newIndex;
    if (direction === "next") {
      newIndex = (currentResultIndex + 1) % searchResults.length;
    } else {
      newIndex =
        currentResultIndex === 0
          ? searchResults.length - 1
          : currentResultIndex - 1;
    }

    setCurrentResultIndex(newIndex);
    const result = searchResults[newIndex];
    onResultSelect(result.start, result.end);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) {
        navigateToResult("prev");
      } else {
        navigateToResult("next");
      }
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  if (!isVisible) return null;

  return (
    <div className="w-full  bg-white  p-2 rounded-md   shadow-sm z-50">

      {/* Main Search Row */}
      <div className="flex-1  flex items-center gap-3 ">
        {/* Search Icon and Input */}
        <div className="flex items-center gap-2 flex-1">
          <IoSearch className="w-4 h-4 text-gray-500" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search in text..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 px-3 py-1.5  rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Results Summary and Navigation */}
        {searchTerm && (
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-gray-500 whitespace-nowrap">
              {searchResults.length === 0
                ? "No results"
                : `${currentResultIndex + 1} of ${searchResults.length}`}
            </span>
            {searchResults.length > 0 && (
              <div className="flex items-center gap-1">
                <Button
                  onClick={() => navigateToResult("prev")}
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  disabled={searchResults.length === 0}
                >
                  <IoChevronUp className="w-3 h-3" />
                </Button>
                <Button
                  onClick={() => navigateToResult("next")}
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  disabled={searchResults.length === 0}
                >
                  <IoChevronDown className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Search Options */}
        <div className="flex items-center gap-2 text-xs">
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={caseSensitive}
              onChange={(e) => setCaseSensitive(e.target.checked)}
              className="w-3 h-3"
            />
            <span className="text-gray-600">Aa</span>
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={wholeWord}
              onChange={(e) => setWholeWord(e.target.checked)}
              className="w-3 h-3"
            />
            <span className="text-gray-600">W</span>
          </label>
        </div>
      </div>

      {/* Results List - Only show if there are results and search term */}
      {searchTerm && searchResults.length > 0 && (
        <div className="max-h-32 mt-2 overflow-y-auto border border-gray-200 rounded-md bg-gray-50">
          {searchResults.map((result) => (
            <div
              key={result.index}
              onClick={() => handleResultClick(result)}
              className={`p-2 cursor-pointer border-b border-gray-100 last:border-b-0 hover:bg-white transition-colors ${
                result.index === currentResultIndex
                  ? "bg-blue-50 border-blue-200"
                  : ""
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-500 mb-1">
                    Line {result.line}
                  </div>
                  <div className="text-xs text-gray-700 truncate">
                    {result.preview}
                  </div>
                </div>
                <div className="text-xs text-gray-400 ml-2">
                  {result.index + 1}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
