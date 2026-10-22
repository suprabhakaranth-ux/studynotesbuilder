import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExportSubject } from "@/lib/export/types";

interface Props {
  subjects: ExportSubject[];
  shown: Set<string>;
  onChange: (next: Set<string>) => void;
}

const YEARS = [1, 2] as const;

/** Filters which subjects appear in the export list. Does not select topics. */
export function YearSubjectFilter({ subjects, shown, onChange }: Props) {
  const toggle = (id: string) => {
    const next = new Set(shown);
    if (next.has(id)) next.delete(id); else next.add(id);
    onChange(next);
  };

  const setYear = (ids: string[]) => {
    const allOn = ids.length > 0 && ids.every((i) => shown.has(i));
    const next = new Set(shown);
    ids.forEach((i) => (allOn ? next.delete(i) : next.add(i)));
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Show subjects</span>
        <span className="text-xs text-muted-foreground">
          {shown.size === 0 ? "Showing all — pick subjects to narrow the list" : `${shown.size} chosen`}
        </span>
        {shown.size > 0 && (
          <button
            type="button"
            onClick={() => onChange(new Set())}
            className="ml-auto text-xs text-primary hover:underline"
          >
            Show all
          </button>
        )}
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {YEARS.map((yr) => {
          const list = subjects.filter((s) => (s.year ?? 1) === yr);
          const ids = list.map((s) => s.id);
          const allOn = ids.length > 0 && ids.every((i) => shown.has(i));
          return (
            <div key={yr} className="rounded-md border border-border bg-muted/30 p-2.5">
              <div className="flex items-center mb-2">
                <span className="text-sm font-semibold">{yr === 1 ? "1st Year" : "2nd Year"}</span>
                <span className="ml-1.5 text-xs text-muted-foreground">({list.length})</span>
                {list.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setYear(ids)}
                    className="ml-auto text-xs text-primary hover:underline"
                  >
                    {allOn ? "Clear" : "All"}
                  </button>
                )}
              </div>
              {list.length === 0 ? (
                <p className="text-xs text-muted-foreground">No subjects</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {list.map((s) => {
                    const on = shown.has(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        aria-pressed={on}
                        onClick={() => toggle(s.id)}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
                          on
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border bg-background hover:bg-accent/50",
                        )}
                      >
                        {on ? (
                          <Check className="h-3 w-3 text-primary" strokeWidth={3} />
                        ) : (
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                        )}
                        <span className="max-w-[180px] truncate">{s.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
