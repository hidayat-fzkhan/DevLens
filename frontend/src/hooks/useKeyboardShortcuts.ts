import { useEffect, useRef } from "react";

type Handlers = {
  onFocusSearch?: () => void;
  onNavigate?: (path: string) => void;
};

const CHORD_TIMEOUT_MS = 1000;

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

export function useKeyboardShortcuts({ onFocusSearch, onNavigate }: Handlers) {
  const handlersRef = useRef<Handlers>({ onFocusSearch, onNavigate });
  handlersRef.current = { onFocusSearch, onNavigate };

  useEffect(() => {
    let chordTimer: ReturnType<typeof setTimeout> | null = null;
    let chordActive = false;

    const clearChord = () => {
      chordActive = false;
      if (chordTimer) {
        clearTimeout(chordTimer);
        chordTimer = null;
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isEditableTarget(event.target)) {
        if (event.key === "Escape" && event.target instanceof HTMLElement) {
          event.target.blur();
        }
        return;
      }

      if (chordActive) {
        const key = event.key.toLowerCase();
        if (key === "b") {
          event.preventDefault();
          handlersRef.current.onNavigate?.("/bugs");
        } else if (key === "u") {
          event.preventDefault();
          handlersRef.current.onNavigate?.("/user-stories");
        } else if (key === "s") {
          event.preventDefault();
          handlersRef.current.onNavigate?.("/settings");
        } else if (key === "h") {
          event.preventDefault();
          handlersRef.current.onNavigate?.("/");
        }
        clearChord();
        return;
      }

      if (event.key === "/") {
        event.preventDefault();
        handlersRef.current.onFocusSearch?.();
        return;
      }

      if (event.key.toLowerCase() === "g") {
        event.preventDefault();
        chordActive = true;
        chordTimer = setTimeout(clearChord, CHORD_TIMEOUT_MS);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearChord();
    };
  }, []);
}
