import { useCallback, useEffect, useState } from "react";

export function useHashSyncedTab<T extends string>(
  defaultValue: T,
  tabs: ReadonlyArray<T>
) {
  const [value, setValue] = useState<T>(defaultValue);

  const setValueAndHash = useCallback((nextValue: T) => {
    setValue(nextValue);
    if (typeof window !== "undefined") {
      const nextUrl = `${window.location.pathname}${window.location.search}#${nextValue}`;
      window.history.replaceState(null, "", nextUrl);
    }
  }, []);

  const isValid = useCallback(
    (value: string): value is T => {
      return tabs.includes(value as T);
    },
    [tabs]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncFromHash = () => {
      const rawHash = window.location.hash?.replace("#", "") ?? "";
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

    window.addEventListener("hashchange", syncFromHash);

    return () => {
      window.removeEventListener("hashchange", syncFromHash);
    };
  }, [defaultValue, isValid, setValueAndHash]);

  return [value, setValueAndHash] as const;
}
