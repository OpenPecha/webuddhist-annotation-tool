import React, {
  useImperativeHandle,
  forwardRef,
  useEffect,
  useCallback,
  useRef,
} from "react";
import CodeMirror from "@uiw/react-codemirror";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { EditorView } from "@codemirror/view";
import { EditorSelection } from "@codemirror/state";
import { BubbleMenu } from "./components/BubbleMenu";
import { DeletePopup } from "./components/DeletePopup";
import { EditPopup } from "./components/EditPopup";
import { useEditorState } from "./hooks/useEditorState";
import { useAnnotationEffects } from "./hooks/useAnnotationEffects";
import {
  annotationField,
  addAnnotationEffect,
  setHighlightedAnnotationEffect,
} from "./extensions/annotationField";
import type { EditorProps, EditorRef } from "./types";

export const Editor = forwardRef<EditorRef, EditorProps>(
  (
    {
      text,
      annotations,
      onTextSelect,
      onAddAnnotation,
      onRemoveAnnotation,
      onUpdateAnnotation,
      onHeaderSelected,
      onUpdateHeaderSpan,
      readOnly = true,
      isCreatingAnnotation = false,
      isDeletingAnnotation = false,
      isUpdatingAnnotation = false,
      highlightedAnnotationId,
      hideScrollbar = false,
    },
    ref
  ) => {
    // Use ref for text to avoid re-renders since text never changes
    const textRef = useRef(text);
    textRef.current = text;

    // Track scroll position to preserve it during updates
    const scrollPositionRef = useRef<{ scrollTop: number; scrollLeft: number }>(
      { scrollTop: 0, scrollLeft: 0 }
    );

    const {
      currentSelection,
      bubbleMenuVisible,
      bubbleMenuPosition,
      annotationText,
      annotationLevel,
      selectedHeaderId,
      deletePopupVisible,
      deletePopupPosition,
      annotationToDelete,
      editPopupVisible,
      editPopupPosition,
      annotationToEdit,
      editorReady,
      setCurrentSelection,
      setBubbleMenuVisible,
      setBubbleMenuPosition,
      setAnnotationText,
      setAnnotationLevel,
      setSelectedHeaderId,
      setDeletePopupVisible,
      setDeletePopupPosition,
      setAnnotationToDelete,
      setEditPopupVisible,
      setEditPopupPosition,
      setAnnotationToEdit,
      setEditorReady,
      resetBubbleMenu,
      resetDeletePopup,
      resetEditPopup,
    } = useEditorState();

    // Track initial scroll position for modals
    const initialScrollPositionRef = useRef<{ top: number; left: number }>({
      top: 0,
      left: 0,
    });
    const initialBubblePositionRef = useRef<{ x: number; y: number } | null>(
      null
    );
    const initialEditPopupPositionRef = useRef<{ x: number; y: number } | null>(
      null
    );

    const editorRef = useAnnotationEffects(annotations, editorReady);

    // Function to save current scroll position
    const saveScrollPosition = useCallback(() => {
      if (editorRef.current?.view) {
        const scrollElement = editorRef.current.view.scrollDOM;
        scrollPositionRef.current = {
          scrollTop: scrollElement.scrollTop,
          scrollLeft: scrollElement.scrollLeft,
        };
      }
    }, []);

    // Function to restore scroll position
    const restoreScrollPosition = useCallback(() => {
      if (editorRef.current?.view) {
        const scrollElement = editorRef.current.view.scrollDOM;
        requestAnimationFrame(() => {
          scrollElement.scrollTop = scrollPositionRef.current.scrollTop;
          scrollElement.scrollLeft = scrollPositionRef.current.scrollLeft;
        });
      }
    }, []);

    useImperativeHandle(ref, () => ({
      scrollToPosition: (start: number, end: number, options?: { select?: boolean }) => {
        if (editorRef.current) {
          const view = editorRef.current.view;
          if (view) {
            const select = options?.select !== false;
            if (select) {
              view.dispatch({
                selection: { anchor: start, head: end },
                effects: EditorView.scrollIntoView(start, { y: "center" }),
              });
              view.focus();
            } else {
              view.dispatch({
                effects: EditorView.scrollIntoView(start, { y: "center" }),
              });
            }
          }
        }
      },
    }));

    // Handle annotation label clicks
    useEffect(() => {
      const handleAnnotationLabelClick = (event: CustomEvent) => {
        const annotation = event.detail.annotation;
        if (annotation) {
          // Don't show delete popup for agreed annotations
          if (annotation.is_agreed) {
            return;
          }

          // Handle annotation label click (same as clicking on annotation mark)
          {
            const popupWidth = 256;
            const popupHeight = 120;
            const margin = 10;

            // Position popup near the label click using viewport coordinates
            const rect = (event.target as HTMLElement).getBoundingClientRect();
            let popupX = rect.left + rect.width / 2;
            let popupY = rect.bottom + 5;

            // Ensure popup stays within viewport bounds
            const popupHalfWidth = popupWidth / 2;
            if (popupX - popupHalfWidth < margin) {
              popupX = popupHalfWidth + margin;
            } else if (popupX + popupHalfWidth > window.innerWidth - margin) {
              popupX = window.innerWidth - popupHalfWidth - margin;
            }

            if (popupY < margin) {
              popupY = margin;
            } else if (popupY + popupHeight > window.innerHeight - margin) {
              popupY = window.innerHeight - popupHeight - margin;
            }

            // Store initial scroll position and edit popup position
            const scrollElement = editorRef.current?.view?.scrollDOM;
            if (scrollElement) {
              initialScrollPositionRef.current = {
                top: scrollElement.scrollTop,
                left: scrollElement.scrollLeft,
              };
              initialEditPopupPositionRef.current = { x: popupX, y: popupY };
            }

            setEditPopupPosition({ x: popupX, y: popupY });
            setAnnotationToEdit(annotation);
            setEditPopupVisible(true);
            setBubbleMenuVisible(false);
          }
        }
      };

      const editorElement = editorRef.current?.view?.dom;
      if (editorElement) {
        editorElement.addEventListener(
          "annotation-label-click",
          handleAnnotationLabelClick as EventListener
        );
      }

      return () => {
        if (editorElement) {
          editorElement.removeEventListener(
            "annotation-label-click",
            handleAnnotationLabelClick as EventListener
          );
        }
      };
    }, [
      setDeletePopupPosition,
      setAnnotationToDelete,
      setDeletePopupVisible,
      setBubbleMenuVisible,
    ]);

    // Handle annotation deletion clicks and outside clicks
    useEffect(() => {
      const handleClick = (event: MouseEvent) => {
        const target = event.target as HTMLElement;
        const annotationElement = target.closest("[data-annotation-id]");
        const deletePopupElement = target.closest(".delete-popup");

        // Close popups if clicking outside of them and not on an annotation
        const editPopupElement = target.closest(".edit-popup");
        if (deletePopupVisible && !deletePopupElement && !annotationElement) {
          resetDeletePopup();
          return;
        }
        if (editPopupVisible && !editPopupElement && !annotationElement) {
          resetEditPopup();
          return;
        }

        // Only handle annotation clicks for deletion
        if (annotationElement) {
          const annotationId =
            annotationElement.getAttribute("data-annotation-id");
          const annotation = annotations.find((ann) => ann.id === annotationId);

          if (annotation) {
            // Don't show delete popup for agreed annotations
            if (annotation.is_agreed) {
              return;
            }

            // Check if there's currently a multi-character selection
            let hasMultiCharSelection = false;
            if (currentSelection && currentSelection.text.length > 1) {
              hasMultiCharSelection = true;
            }

            // Only show delete popup if there's no multi-character selection
            if (!hasMultiCharSelection) {
              const rect = annotationElement.getBoundingClientRect();
              {
                const popupWidth = 256;
                const popupHeight = 120;
                const margin = 10;

                let popupX = rect.left + rect.width / 2;
                let popupY = rect.bottom + 5;

                // Ensure popup stays within viewport bounds
                const popupHalfWidth = popupWidth / 2;
                if (popupX - popupHalfWidth < margin) {
                  popupX = popupHalfWidth + margin;
                } else if (
                  popupX + popupHalfWidth >
                  window.innerWidth - margin
                ) {
                  popupX = window.innerWidth - popupHalfWidth - margin;
                }

                if (popupY < margin) {
                  popupY = margin;
                } else if (popupY + popupHeight > window.innerHeight - margin) {
                  popupY = window.innerHeight - popupHeight - margin;
                }

                // Store initial scroll position and edit popup position
                const scrollElement = editorRef.current?.view?.scrollDOM;
                if (scrollElement) {
                  initialScrollPositionRef.current = {
                    top: scrollElement.scrollTop,
                    left: scrollElement.scrollLeft,
                  };
                  initialEditPopupPositionRef.current = {
                    x: popupX,
                    y: popupY,
                  };
                }

                setEditPopupPosition({ x: popupX, y: popupY });
                setAnnotationToEdit(annotation);
                setEditPopupVisible(true);
                setBubbleMenuVisible(false);
              }
            }
          }
        }
      };

      const editorElement = editorRef.current?.view?.dom;
      if (editorElement) {
        editorElement.addEventListener("click", handleClick, true);
      }

      return () => {
        if (editorElement) {
          editorElement.removeEventListener("click", handleClick, true);
        }
      };
    }, [
      annotations,
      deletePopupVisible,
      currentSelection,
      resetDeletePopup,
      setBubbleMenuVisible,
      setDeletePopupPosition,
      setAnnotationToDelete,
      setDeletePopupVisible,
    ]);

    // Add keyboard event listener for closing popups
    useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          resetBubbleMenu();
          resetDeletePopup();
        }
      };

      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.removeEventListener("keydown", handleKeyDown);
      };
    }, [resetBubbleMenu, resetDeletePopup]);

    // Add scroll event listener to update modal positions
    useEffect(() => {
      const handleScroll = () => {
        if (!editorRef.current?.view) return;

        const scrollElement = editorRef.current.view.scrollDOM;
        const currentScrollTop = scrollElement.scrollTop;
        const currentScrollLeft = scrollElement.scrollLeft;

        const scrollDeltaY =
          currentScrollTop - initialScrollPositionRef.current.top;
        const scrollDeltaX =
          currentScrollLeft - initialScrollPositionRef.current.left;

        // Update bubble menu position if visible
        if (bubbleMenuVisible && initialBubblePositionRef.current) {
          setBubbleMenuPosition({
            x: initialBubblePositionRef.current.x - scrollDeltaX,
            y: initialBubblePositionRef.current.y - scrollDeltaY,
            transformX: "-50%",
          });
        }

        // Update edit popup position if visible
        if (editPopupVisible && initialEditPopupPositionRef.current) {
          setEditPopupPosition({
            x: initialEditPopupPositionRef.current.x - scrollDeltaX,
            y: initialEditPopupPositionRef.current.y - scrollDeltaY,
          });
        }
      };

      const editorElement = editorRef.current?.view?.scrollDOM;
      if (editorElement) {
        editorElement.addEventListener("scroll", handleScroll);
        return () => {
          editorElement.removeEventListener("scroll", handleScroll);
        };
      }
    }, [
      bubbleMenuVisible,
      editPopupVisible,
      setBubbleMenuPosition,
      setEditPopupPosition,
    ]);

    // Clear position refs when modals are closed
    useEffect(() => {
      if (!bubbleMenuVisible) {
        initialBubblePositionRef.current = null;
      }
    }, [bubbleMenuVisible]);

    useEffect(() => {
      if (!editPopupVisible) {
        initialEditPopupPositionRef.current = null;
      }
    }, [editPopupVisible]);

    const handleSelectionComplete = useCallback(
      (selection: EditorSelection) => {
        // Close delete popup when selection changes
        if (deletePopupVisible) {
          resetDeletePopup();
        }

        if (selection?.ranges?.length > 0) {
          const range = selection.ranges[0];
          const start = range.from;
          const end = range.to;

          const isCursorPosition = start === end;
          const selectedText = isCursorPosition
            ? ""
            : textRef.current.substring(start, end);
          const newCurrentSelection = {
            text: selectedText,
            startIndex: start,
            endIndex: end,
          };

          setCurrentSelection(newCurrentSelection);
          onTextSelect({ text: selectedText, start, end });

          // Position and show bubble menu (for both selection and cursor click)
          if (editorRef.current?.view) {
            const view = editorRef.current.view;
            const startCoords = view.coordsAtPos(start);
            const endCoords = view.coordsAtPos(end);

            if (startCoords && endCoords) {
              const selectionCenterX = isCursorPosition
                ? startCoords.left
                : (startCoords.left + endCoords.right) / 2;
              const selectionBottom = Math.max(
                startCoords.bottom,
                endCoords.bottom
              );
              const selectionTop = Math.min(startCoords.top, endCoords.top);

              const viewportWidth = window.innerWidth;
              const viewportHeight = window.innerHeight;
              const bubbleWidth = 380;
              const bubbleHeight = 350; // Must match BubbleMenu actual height (search, list max-h-60, buttons) to avoid overlapping selection
              const margin = 10;

              const spaceBelow = viewportHeight - selectionBottom;
              const spaceAbove = selectionTop;
              const bubbleSpacing = 20;

              let bubbleY =
                spaceBelow >= bubbleHeight + margin + bubbleSpacing
                  ? selectionBottom + bubbleSpacing
                  : spaceAbove >= bubbleHeight + margin + bubbleSpacing
                  ? selectionTop - bubbleHeight - bubbleSpacing
                  : spaceBelow > spaceAbove
                  ? selectionBottom + bubbleSpacing
                  : selectionTop - bubbleHeight - bubbleSpacing;

              if (bubbleY < margin) bubbleY = margin;
              else if (bubbleY + bubbleHeight > viewportHeight - margin) {
                bubbleY = viewportHeight - bubbleHeight - margin;
              }

              let bubbleX = selectionCenterX;
              const bubbleTransformX = "-50%";
              const bubbleHalfWidth = bubbleWidth / 2;

              if (bubbleX - bubbleHalfWidth < margin) {
                bubbleX = bubbleHalfWidth + margin;
              } else if (bubbleX + bubbleHalfWidth > viewportWidth - margin) {
                bubbleX = viewportWidth - bubbleHalfWidth - margin;
              }

              const scrollElement = editorRef.current.view.scrollDOM;
              initialScrollPositionRef.current = {
                top: scrollElement.scrollTop,
                left: scrollElement.scrollLeft,
              };
              initialBubblePositionRef.current = { x: bubbleX, y: bubbleY };

              setBubbleMenuPosition({
                x: bubbleX,
                y: bubbleY,
                transformX: bubbleTransformX,
              });
              setBubbleMenuVisible(true);
            }
          }
        } else {
          // Only close bubble when selection is cleared; if bubble is visible, user may be clicking inside it
          if (!bubbleMenuVisible) {
            resetBubbleMenu();
            onTextSelect(null);
          }
          if (deletePopupVisible) {
            resetDeletePopup();
          }
        }
      },
      [
        bubbleMenuVisible,
        deletePopupVisible,
        onTextSelect,
        resetBubbleMenu,
        resetDeletePopup,
        setCurrentSelection,
        setBubbleMenuPosition,
        setBubbleMenuVisible,
      ]
    );

    const handleAddAnnotation = useCallback(
      (type: string, name?: string, level?: string) => {
        if (!currentSelection) return;

        // Save scroll position before adding annotation
        saveScrollPosition();

        if (type === "header" && onHeaderSelected) {
          onHeaderSelected({
            text: currentSelection.text,
            start: currentSelection.startIndex,
            end: currentSelection.endIndex,
          });
        } else {
          onAddAnnotation(
            type,
            name || annotationText || undefined,
            level || annotationLevel || undefined
          );
        }

        resetBubbleMenu();
        onTextSelect(null);

        // Restore scroll position after a short delay to allow DOM updates
        setTimeout(() => {
          restoreScrollPosition();
        }, 50);
      },
      [
        currentSelection,
        onHeaderSelected,
        onAddAnnotation,
        annotationText,
        annotationLevel,
        resetBubbleMenu,
        onTextSelect,
        saveScrollPosition,
        restoreScrollPosition,
      ]
    );

    const handleUpdateHeaderSpan = useCallback(() => {
      if (!currentSelection || !selectedHeaderId || !onUpdateHeaderSpan) return;

      onUpdateHeaderSpan(
        selectedHeaderId,
        currentSelection.startIndex,
        currentSelection.endIndex
      );

      resetBubbleMenu();
      onTextSelect(null);
    }, [
      currentSelection,
      selectedHeaderId,
      onUpdateHeaderSpan,
      resetBubbleMenu,
      onTextSelect,
    ]);

    const handleDeleteAnnotation = useCallback(() => {
      if (annotationToDelete) {
        // Save scroll position before deletion
        saveScrollPosition();

        onRemoveAnnotation(annotationToDelete.id);
        resetDeletePopup();

        // Restore scroll position after deletion
        setTimeout(() => {
          restoreScrollPosition();
        }, 50);
      }
    }, [
      annotationToDelete,
      onRemoveAnnotation,
      resetDeletePopup,
      saveScrollPosition,
      restoreScrollPosition,
    ]);

    const handleUpdateAnnotation = useCallback(
      (
        annotationId: string,
        newType: string,
        newText?: string,
        newLevel?: string
      ) => {
        if (onUpdateAnnotation) {
          // Use the passed update function if available
          onUpdateAnnotation(annotationId, newType, newText, newLevel);
        } else {
          // Fallback to remove and add if no update function provided
          // Save scroll position before update
          saveScrollPosition();

          // Find the annotation to update
          const annotation = annotations.find((ann) => ann.id === annotationId);
          if (annotation) {
            // Remove the old annotation and add the updated one
            onRemoveAnnotation(annotationId);
            // Add new annotation with same position but new type/text/level
            onAddAnnotation(newType, newText, newLevel);
          }

          // Restore scroll position after update
          setTimeout(() => {
            restoreScrollPosition();
          }, 50);
        }

        resetEditPopup();
      },
      [
        annotations,
        onRemoveAnnotation,
        onAddAnnotation,
        onUpdateAnnotation,
        resetEditPopup,
        saveScrollPosition,
        restoreScrollPosition,
      ]
    );

    const handleDeleteFromEdit = useCallback(() => {
      if (annotationToEdit) {
        // Save scroll position before deletion
        saveScrollPosition();

        onRemoveAnnotation(annotationToEdit.id);
        resetEditPopup();

        // Restore scroll position after deletion
        setTimeout(() => {
          restoreScrollPosition();
        }, 50);
      }
    }, [
      annotationToEdit,
      onRemoveAnnotation,
      resetEditPopup,
      saveScrollPosition,
      restoreScrollPosition,
    ]);

    const extensions = [
      markdown({ base: markdownLanguage, codeLanguages: languages }),
      annotationField,
      EditorView.updateListener.of((update) => {
        if (update.selectionSet) {
          handleSelectionComplete(update.state.selection);
        }
      }),
      EditorView.theme({
        "&": {
          fontSize: "16px",
          lineHeight: "1.5",
        },
        ".cm-content": {
          padding: "12px",
          fontFamily: "'monlam', monospace",
          whiteSpace: "pre-wrap",
          fontSize: "14px",
          minHeight: "100%",
          maxWidth: "95%",
          overflowWrap: "break-word",
          lineHeight: "2",
          wordBreak: "break-word",
        },
        ".cm-line": {
          padding: "0",
          maxWidth: "100%",
          overflowWrap: "break-word",
          wordBreak: "break-word",
        },
        ".cm-editor": {
          height: "100%",
          width: "100%",
          maxWidth: "100%",
          overflow: "hidden",
        },
        ".cm-scroller": {
          overflow: "auto",
          height: "100%",
          scrollBehavior: "smooth",
          scrollbarWidth: hideScrollbar ? "none" : "auto", // Firefox
          msOverflowStyle: hideScrollbar ? "none" : "auto", // IE/Edge
        },
        ".cm-focused": {
          outline: "none",
        },
        ".cm-activeLine": {
          backgroundColor: "transparent",
        },
        ".cm-cursor": {
          borderLeft: "2px solid #333",
          display: "block !important",
          opacity: "1 !important",
        },
        ".cm-editor.cm-readonly .cm-cursor": {
          borderLeft: "2px solid #666",
          display: "block !important",
          opacity: "1 !important",
        },
        ".cm-scroller::-webkit-scrollbar": {
          width: hideScrollbar ? "0px" : "8px",
          height: hideScrollbar ? "0px" : "8px",
        },
        ".cm-scroller::-webkit-scrollbar-track": {
          background: hideScrollbar ? "transparent" : "#f8f9fa",
          borderRadius: "6px",
        },
        ".cm-scroller::-webkit-scrollbar-thumb": {
          background: hideScrollbar ? "transparent" : "#6c757d",
          borderRadius: "6px",
          border: hideScrollbar ? "none" : "2px solid #f8f9fa",
        },
        ".cm-scroller::-webkit-scrollbar-thumb:hover": {
          background: hideScrollbar ? "transparent" : "#495057",
        },
        ".cm-scroller::-webkit-scrollbar-corner": {
          background: hideScrollbar ? "transparent" : "#f8f9fa",
        },
      }),
    ];

    // Update highlighted annotation when highlightedAnnotationId changes
    useEffect(() => {
      if (editorReady && editorRef.current?.view) {
        const view = editorRef.current.view;

        // Save current scroll position
        const scrollElement = view.scrollDOM;
        const scrollTop = scrollElement.scrollTop;
        const scrollLeft = scrollElement.scrollLeft;

        view.dispatch({
          effects: [
            setHighlightedAnnotationEffect.of(highlightedAnnotationId || null),
          ],
        });

        // Re-add all annotations after highlighting changes
        if (annotations.length > 0) {
          annotations.forEach((annotation) => {
            view.dispatch({
              effects: addAnnotationEffect.of(annotation),
            });
          });
        }

        // Restore scroll position after a short delay to allow DOM updates
        requestAnimationFrame(() => {
          scrollElement.scrollTop = scrollTop;
          scrollElement.scrollLeft = scrollLeft;
        });
      }
    }, [highlightedAnnotationId, editorReady, annotations]);

    // Apply dynamic annotation styling
    useEffect(() => {
      const applyAnnotationStyles = async () => {
        try {
          const style = document.createElement("style");
          const baseStyles = `
            /* Level-based styles are defined in index.css */
            /* This ensures consistent styling across all components */
          `;

          const optimisticStyles = `
            .annotation-optimistic {
              animation: annotationFlash 0.4s ease-out;
              opacity: 0.85;
            }
            
            .annotation-agreed {
              background-color: #dcfce7 !important;
              border-color: #22c55e !important;
              color: #15803d !important;
              cursor: default !important;
              position: relative;
            }
            
            .annotation-agreed::after {
              content: "🔒";
              position: absolute;
              right: 2px;
              top: 50%;
              transform: translateY(-50%);
              font-size: 8px;
              pointer-events: none;
            }
            
            .annotation-label-agreed {
              background-color: #dcfce7 !important;
              border: 1px solid #22c55e !important;
              color: #15803d !important;
              cursor: default !important;
              font-weight: 600;
            }
            
            .annotation-highlighted {
              animation: annotationHighlight 1s ease-out;
              box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5) !important;
              background-color: rgba(59, 130, 246, 0.2) !important;
              border-color: rgba(59, 130, 246, 0.8) !important;
              z-index: 10;
              position: relative;
            }
            
            .annotation-label-highlighted {
              animation: annotationHighlight 1s ease-out;
              box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5) !important;
              background-color: rgba(59, 130, 246, 0.2) !important;
              border-color: rgba(59, 130, 246, 0.8) !important;
              z-index: 10;
              position: relative;
            }
            
            @keyframes annotationFlash {
              0% {
                transform: scale(1);
                box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7);
              }
              50% {
                transform: scale(1.03);
                box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
              }
              100% {
                transform: scale(1);
                box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
              }
            }
            
            @keyframes annotationHighlight {
              0% {
                box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.5);
                background-color: rgba(59, 130, 246, 0.1);
              }
              50% {
                box-shadow: 0 0 0 8px rgba(59, 130, 246, 0.3);
                background-color: rgba(59, 130, 246, 0.3);
              }
              100% {
                box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5);
                background-color: rgba(59, 130, 246, 0.2);
              }
            }
          `;

          style.textContent = baseStyles + optimisticStyles;
          document.head.appendChild(style);

          return () => {
            document.head.removeChild(style);
          };
        } catch (error) {
          console.error("Failed to apply annotation styles:", error);
        }
      };

      applyAnnotationStyles();
    }, []);

    // Preserve scroll position when annotations change
    useEffect(() => {
      if (editorReady && editorRef.current?.view) {
        const view = editorRef.current.view;
        const scrollElement = view.scrollDOM;

        // Save current scroll position before any potential re-render
        const currentScrollTop = scrollElement.scrollTop;
        const currentScrollLeft = scrollElement.scrollLeft;

        // Schedule scroll position restoration after current render cycle
        const timeoutId = setTimeout(() => {
          if (
            scrollElement.scrollTop !== currentScrollTop ||
            scrollElement.scrollLeft !== currentScrollLeft
          ) {
            scrollElement.scrollTop = currentScrollTop;
            scrollElement.scrollLeft = currentScrollLeft;
          }
        }, 0);

        return () => clearTimeout(timeoutId);
      }
    }, [annotations.length, editorReady]); // Only when annotation count changes

    return (
      <div className="h-full min-h-[200px] flex-1  bg-white rounded-lg shadow-lg relative">
        <CodeMirror
          ref={editorRef}
          value={textRef.current}
          className="h-full"
          height="100%"
          extensions={extensions}
          readOnly={readOnly}
          onCreateEditor={(view) => {
            // Store the view in the editorRef for useImperativeHandle and useAnnotationEffects.
            // Annotations are applied only by useAnnotationEffects (which runs when editorReady
            // becomes true), so we never apply annotations on first paint—only when filter allows.
            if (editorRef.current) {
              editorRef.current.view = view;
            }
            setEditorReady(true);
          }}
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            dropCursor: false,
            allowMultipleSelections: false,
            highlightActiveLine: true,
            highlightSelectionMatches: false,
            searchKeymap: true,
          }}
        />

        <div className="text-xs text-gray-500 sticky w-max right-1 bottom-1 float-right border  rounded-md py-1 px-2">
          {textRef.current?.length || 0} characters
        </div>

        <BubbleMenu
          visible={bubbleMenuVisible}
          position={bubbleMenuPosition}
          currentSelection={currentSelection}
          annotationText={annotationText}
          annotationLevel={annotationLevel}
          selectedHeaderId={selectedHeaderId}
          annotations={annotations}
          isCreatingAnnotation={isCreatingAnnotation}
          contextAnnotation={annotationToEdit || undefined}
          onAddAnnotation={handleAddAnnotation}
          onCancel={resetBubbleMenu}
          onAnnotationTextChange={setAnnotationText}
          onAnnotationLevelChange={setAnnotationLevel}
          onSelectedHeaderIdChange={setSelectedHeaderId}
          onUpdateHeaderSpan={handleUpdateHeaderSpan}
        />

        <DeletePopup
          visible={deletePopupVisible}
          position={deletePopupPosition}
          annotation={annotationToDelete}
          isDeletingAnnotation={isDeletingAnnotation}
          onDelete={handleDeleteAnnotation}
          onCancel={resetDeletePopup}
        />

        <EditPopup
          visible={editPopupVisible}
          position={editPopupPosition}
          annotation={annotationToEdit}
          content={text}
          isUpdatingAnnotation={isUpdatingAnnotation}
          onUpdate={handleUpdateAnnotation}
          onDelete={handleDeleteFromEdit}
          onCancel={resetEditPopup}
        />
      </div>
    );
  }
);

Editor.displayName = "Editor";
