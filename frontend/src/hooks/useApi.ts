import { useEffect, useState } from "react";
import { ApiError } from "../api/client";

interface State<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

// Runs an async loader on mount and tracks loading/error/data state.
export function useApi<T>(loader: () => Promise<T>, deps: unknown[] = []): State<T> {
  const [state, setState] = useState<State<T>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let active = true;
    setState({ data: null, loading: true, error: null });
    loader()
      .then((data) => {
        if (active) setState({ data, loading: false, error: null });
      })
      .catch((err) => {
        if (!active) return;
        const msg =
          err instanceof ApiError ? err.message : "Failed to load data.";
        setState({ data: null, loading: false, error: msg });
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}
