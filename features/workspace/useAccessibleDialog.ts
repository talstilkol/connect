"use client";

import {
  useEffect,
  useRef,
} from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export function resolveFocusTrapTarget(
  currentIndex: number,
  focusableCount: number,
  backwards: boolean,
): number | null {
  if (focusableCount <= 0) {
    return null;
  }

  if (backwards) {
    return currentIndex <= 0
      ? focusableCount - 1
      : null;
  }

  return currentIndex < 0 ||
    currentIndex >= focusableCount - 1
    ? 0
    : null;
}

export function useAccessibleDialog(
  onClose: () => void,
) {
  const dialogRef =
    useRef<HTMLElement | null>(null);
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    const opener =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    if (!dialog) {
      return;
    }

    const initialFocus =
      dialog.querySelector<HTMLElement>(
        "[data-dialog-initial-focus]",
      ) ??
      dialog.querySelector<HTMLElement>(
        FOCUSABLE_SELECTOR,
      ) ??
      dialog;
    initialFocus.focus();

    const handleKeyDown = (
      event: KeyboardEvent,
    ) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusable = [
        ...dialog.querySelectorAll<HTMLElement>(
          FOCUSABLE_SELECTOR,
        ),
      ].filter(
        (element) =>
          element.getAttribute("aria-hidden") !==
            "true" &&
          !element.hasAttribute("hidden"),
      );
      const currentIndex = focusable.indexOf(
        document.activeElement as HTMLElement,
      );
      const targetIndex =
        resolveFocusTrapTarget(
          currentIndex,
          focusable.length,
          event.shiftKey,
        );

      if (targetIndex === null) {
        return;
      }

      event.preventDefault();
      focusable[targetIndex]?.focus();
    };

    document.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown,
      );

      if (opener?.isConnected) {
        opener.focus();
      }
    };
  }, []);

  return dialogRef;
}
