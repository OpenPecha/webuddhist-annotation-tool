import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import type { Annotation } from "@/utils/annotationConverter";
import { getAnnotationDisplayLabel } from "@/utils/annotationConverter";
import type { TextAnnotatorRef } from "@/components/TextAnnotator";
import { TOAST_MESSAGES, NAVIGATION_DELAYS } from "@/constants/taskConstants";

/**
 * Custom hook that manages annotation navigation and highlighting
 * Handles URL parameters, scrolling to annotations, and highlight states
 * 
 * @param annotations - Current annotations array
 */
export const useAnnotationNavigation = (annotations: Annotation[]) => {
  const location = useLocation();
  const { toast } = useToast();
  const textAnnotatorRef = useRef<TextAnnotatorRef>(null);

  const [targetAnnotationId, setTargetAnnotationId] = useState<string | null>(null);
  const [hasScrolledToTarget, setHasScrolledToTarget] = useState(false);
  const [highlightedAnnotationId, setHighlightedAnnotationId] = useState<string | null>(null);

  /**
   * Clears highlight after a delay
   */
  const clearHighlight = useCallback(() => {
    setTimeout(() => {
      setHighlightedAnnotationId(null);
    }, NAVIGATION_DELAYS.HIGHLIGHT_CLEAR);
  }, []);

  /**
   * Scrolls to annotation position in editor
   */
  const scrollToAnnotation = useCallback((annotation: Annotation) => {
    if (textAnnotatorRef.current) {
      textAnnotatorRef.current.scrollToPosition(annotation.start, annotation.end, { select: false });
      setTimeout(() => {
        textAnnotatorRef.current.scrollToPosition(annotation.start, annotation.end, { select: false });
      }, 100);

    }
  }, []);

  /**
   * Shows navigation toast with annotation info
   */
  const showNavigationToast = useCallback((annotation: Annotation) => {
    const truncatedText = annotation.text.substring(0, 50);
    const displayText = annotation.text.length > 50 ? `${truncatedText}...` : truncatedText;
    const displayLabel = getAnnotationDisplayLabel(annotation);

    toast({
      title: TOAST_MESSAGES.NAVIGATED_TO_ANNOTATION,
      description: `Found "${displayLabel}" annotation: "${displayText}"`,
    });
  }, [toast]);

  /**
   * Parse URL parameters on mount and when URL changes
   */
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const annotationId = urlParams.get("annotationId");
    
    if (annotationId) {
      setTargetAnnotationId(annotationId);
      setHasScrolledToTarget(false);
    }
  }, [location.search]);

  /**
   * Scroll to target annotation when annotations are loaded
   */
  useEffect(() => {
    if (!targetAnnotationId || annotations.length === 0 || hasScrolledToTarget) {
      return;
    }

    const targetAnnotation = annotations.find((ann) => ann.id === targetAnnotationId);
    
    if (targetAnnotation) {
      scrollToAnnotation(targetAnnotation);
      setHighlightedAnnotationId(targetAnnotationId);
      showNavigationToast(targetAnnotation);
      setHasScrolledToTarget(true);

      // Clear URL parameter after scrolling
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete("annotationId");
      window.history.replaceState({}, "", newUrl.toString());

      clearHighlight();
    } else {
      toast({
        title: TOAST_MESSAGES.ANNOTATION_NOT_FOUND,
        description: `Could not find annotation with ID: ${targetAnnotationId}`,
      });
      setTargetAnnotationId(null);
    }
  }, [targetAnnotationId, annotations, hasScrolledToTarget, scrollToAnnotation, showNavigationToast, clearHighlight, toast]);

  /**
   * Handles click on header (table of contents item)
   */
  const handleHeaderClick = useCallback((annotation: Annotation) => {
    // Log for debugging, but don't auto-scroll
    // User can manually navigate if needed
  }, []);

  /**
   * Handles click on annotation from sidebar
   */
  const handleAnnotationClick = useCallback((annotation: Annotation) => {
    scrollToAnnotation(annotation);
    setHighlightedAnnotationId(annotation.id);
    showNavigationToast(annotation);
    clearHighlight();
  }, [scrollToAnnotation, showNavigationToast, clearHighlight]);

  return {
    // Ref for text annotator component
    textAnnotatorRef,
    
    // State
    highlightedAnnotationId,
    
    // Functions
    handleHeaderClick,
    handleAnnotationClick,
  };
};

