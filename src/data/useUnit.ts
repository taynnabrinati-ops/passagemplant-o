import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useUnits } from "./queries";

/** Reads and writes the `?unit=` slug that selects the board's unit. */
export function useUnitSlug() {
  const [searchParams, setSearchParams] = useSearchParams();
  const slug = searchParams.get("unit") ?? undefined;

  const setSlug = useCallback(
    (next: string) => {
      const params = new URLSearchParams(searchParams);
      params.set("unit", next);
      setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  return { slug, setSlug };
}

/** The unit the board is showing: the one named in the URL, else the first. */
export function useActiveUnit() {
  const { slug } = useUnitSlug();
  const units = useUnits();

  if (!units.data || units.data.length === 0) return undefined;
  if (slug) {
    const match = units.data.find((unit) => unit.slug === slug);
    if (match) return match;
  }
  return units.data[0];
}
