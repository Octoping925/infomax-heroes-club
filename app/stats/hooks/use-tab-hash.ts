import { useCallback, useEffect, useState } from "react";

export function useHashSyncedTab<T extends string>(
  defaultValue: T,
  tabs: ReadonlyArray<T>
) {
  const [value, setValue] = useState<T>(defaultValue);

  const setValueAndHash = useCallback((nextValue: T) => {
    setValue(nextValue);
    if (globalThis.window !== undefined) {
      const nextUrl = `${globalThis.window.location.pathname}${globalThis.window.location.search}#${nextValue}`;
      globalThis.window.history.replaceState(null, "", nextUrl);
    }
  }, []);

  const isValid = useCallback(
    (value: string): value is T => {
      return tabs.includes(value as T);
    },
    [tabs]
  );

  useEffect(() => {
    if (globalThis.window === undefined) return;

    const syncFromHash = () => {
      const rawHash = globalThis.window.location.hash?.replace("#", "") ?? "";
      if (rawHash && isValid(rawHash)) {
        setValue(rawHash);
        return;
      }

      // Ensure default hash is present so refresh keeps tab state stable.
      if (!rawHash) {
        setValueAndHash(defaultValue);
      }
    };

    syncFromHash();

    globalThis.window.addEventListener("hashchange", syncFromHash);

    return () => {
      globalThis.window.removeEventListener("hashchange", syncFromHash);
    };
  }, [defaultValue, isValid, setValueAndHash]);

  return [value, setValueAndHash] as const;
}
