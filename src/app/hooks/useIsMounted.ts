import { useEffect, useRef, useCallback } from "react";

/**
 * Returns a function that reports whether the calling component is still
 * mounted. Intended for guarding setState calls inside async functions
 * (like a page's data-loading load()) so a slow request that resolves
 * after the user has already navigated away doesn't try to update state
 * on an unmounted component.
 *
 * The returned function is referentially stable across renders (it is
 * itself wrapped in useCallback with an empty dependency array), which
 * matters because callers commonly include it in another useCallback's
 * dependency array, e.g. a page's load() function. If this hook returned
 * a fresh closure on every render instead, that would change on every
 * render too, which would re-create load() on every render, which would
 * re-run any effect that depends on load(), re-triggering the load and
 * causing a render loop that never lets data settle on screen.
 *
 * Usage:
 *   const isMounted = useIsMounted();
 *   const load = useCallback(async () => {
 *     const data = await getThing();
 *     if (isMounted()) setData(data);
 *   }, [isMounted]);
 */
export function useIsMounted(): () => boolean {
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return useCallback(() => mountedRef.current, []);
}
