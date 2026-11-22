import { useState, useEffect, useRef, useMemo } from "react";
import { ChevronDown, FlaskConical, Check, PlusCircle, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface ChargeOption {
  id?: string | number;
  name: string;
  amount: number;
  category?: string;
}

interface ChargeComboboxProps {
  value: string;
  onChange: (value: string, matchedAmount?: number) => void;
  options: ChargeOption[];
  placeholder?: string;
  className?: string;
}

export function ChargeCombobox({
  value,
  onChange,
  options,
  placeholder = "Select or type procedure...",
  className = "h-9",
}: ChargeComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value || "");
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  const validOptions = useMemo(() => {
    return (options || []).filter((o) => o && o.name && o.name.trim() !== "");
  }, [options]);

  const filtered = useMemo(() => {
    if (!query.trim()) return validOptions;
    const q = query.toLowerCase().trim();
    return validOptions.filter((o) => o.name.toLowerCase().includes(q));
  }, [validOptions, query]);

  useEffect(() => {
    setSelectedIndex(-1);
  }, [filtered.length]);

  const handleSelectOption = (opt: ChargeOption) => {
    setQuery(opt.name);
    onChange(opt.name, opt.amount);
    setOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setOpen(true);
        return;
      }
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (filtered.length > 0 ? (prev + 1) % filtered.length : -1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (filtered.length > 0 ? (prev - 1 + filtered.length) % filtered.length : -1));
    } else if (e.key === "Enter") {
      if (selectedIndex >= 0 && selectedIndex < filtered.length) {
        e.preventDefault();
        handleSelectOption(filtered[selectedIndex]);
      } else if (query.trim()) {
        setOpen(false);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div className="relative flex-1 w-full">
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              const nextVal = e.target.value;
              setQuery(nextVal);
              setOpen(true);
              const match = validOptions.find(
                (o) => o.name.toLowerCase().trim() === nextVal.toLowerCase().trim()
              );
              onChange(nextVal, match ? match.amount : undefined);
            }}
            onFocus={() => setOpen(true)}
            onClick={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={cn(
              "pr-9 transition-all text-sm",
              open ? "ring-2 ring-teal-500/80 border-teal-500 shadow-xs" : "",
              className
            )}
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpen((prev) => !prev);
            }}
            className={cn(
              "absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted/60 transition-colors cursor-pointer",
              open ? "text-teal-500" : "text-muted-foreground"
            )}
            title="Toggle procedure list"
          >
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform duration-200",
                open ? "rotate-180 text-teal-400" : ""
              )}
            />
          </button>
        </div>
      </PopoverAnchor>

      <PopoverContent
        align="start"
        sideOffset={4}
        className="w-[var(--radix-popover-trigger-width)] min-w-[320px] max-w-[550px] p-0 rounded-xl border border-border shadow-2xl bg-popover text-popover-foreground overflow-hidden"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {/* Header bar */}
        <div className="px-3 py-1.5 bg-muted/60 border-b border-border/60 flex items-center justify-between text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          <span className="flex items-center gap-1.5">
            <Search className="h-3 w-3" />
            Charges &amp; Procedures ({filtered.length})
          </span>
          <span>Price (₹)</span>
        </div>

        {/* Options list */}
        <div className="max-h-56 overflow-y-auto p-1.5 space-y-1">
          {filtered.length === 0 ? (
            <div className="p-3 text-center rounded-lg bg-teal-500/10 border border-teal-500/20 m-1">
              <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-teal-400">
                <PlusCircle className="h-3.5 w-3.5" />
                Custom procedure: "{query}"
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Not in catalog — press Enter or Tab to use this custom charge name.
              </p>
            </div>
          ) : (
            filtered.map((opt, i) => {
              const isSelected =
                selectedIndex === i ||
                opt.name.toLowerCase().trim() === query.toLowerCase().trim();

              return (
                <div
                  key={opt.id || `${opt.name}-${i}`}
                  className={cn(
                    "px-3 py-2 rounded-lg cursor-pointer transition-all flex items-center justify-between text-xs group",
                    isSelected
                      ? "bg-teal-500/15 text-teal-300 font-semibold shadow-xs"
                      : "hover:bg-muted/70 text-foreground"
                  )}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelectOption(opt);
                  }}
                  onMouseEnter={() => setSelectedIndex(i)}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-3">
                    <div
                      className={cn(
                        "h-6 w-6 rounded-md flex items-center justify-center shrink-0 transition-colors",
                        isSelected
                          ? "bg-teal-500/25 text-teal-300"
                          : "bg-muted text-muted-foreground group-hover:bg-teal-500/15 group-hover:text-teal-400"
                      )}
                    >
                      <FlaskConical className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold truncate text-sm">
                          {opt.name}
                        </span>
                        {opt.category && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/80 text-muted-foreground border border-border/50 shrink-0">
                            {opt.category}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={cn(
                        "font-mono font-bold text-xs px-2 py-0.5 rounded-md border transition-colors",
                        isSelected
                          ? "bg-teal-500/20 text-teal-300 border-teal-500/40"
                          : "bg-teal-500/10 text-teal-400 border-teal-500/20 group-hover:bg-teal-500/20"
                      )}
                    >
                      ₹ {Number(opt.amount).toFixed(2)}
                    </span>
                    {isSelected && <Check className="h-3.5 w-3.5 text-teal-400 shrink-0" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer note */}
        <div className="px-3 py-1 bg-muted/30 border-t border-border/40 text-[10px] text-muted-foreground flex justify-between items-center">
          <span>↑↓ Navigate • Enter Select • Esc Close</span>
          <span>Custom charge allowed</span>
        </div>
      </PopoverContent>
    </Popover>
  );
}
