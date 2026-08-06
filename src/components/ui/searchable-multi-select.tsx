import * as React from "react";
import { Check, ChevronsUpDown, Plus, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type MultiOption = {
  label: string;
  value: string;
};

interface SearchableMultiSelectProps {
  options: MultiOption[];
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  allowCustom?: boolean;
  className?: string;
  disabled?: boolean;
}

export function SearchableMultiSelect({
  options,
  values = [],
  onChange,
  placeholder = "Select or type categories...",
  searchPlaceholder = "Search or type category...",
  allowCustom = true,
  className,
  disabled = false,
}: SearchableMultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const filteredOptions = React.useMemo(() => {
    if (!search.trim()) return options;
    const s = search.toLowerCase().trim();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(s) ||
        opt.value.toLowerCase().includes(s),
    );
  }, [options, search]);

  const toggleOption = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed) return;
    if (values.includes(trimmed)) {
      onChange(values.filter((v) => v !== trimmed));
    } else {
      onChange([...values, trimmed]);
    }
  };

  const removeValue = (val: string) => {
    onChange(values.filter((v) => v !== val));
  };

  const showCustomOption =
    allowCustom &&
    search.trim().length > 0 &&
    !values.includes(search.trim()) &&
    !options.some(
      (opt) =>
        opt.value.toLowerCase() === search.trim().toLowerCase() ||
        opt.label.toLowerCase() === search.trim().toLowerCase(),
    );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal text-left min-h-9 h-auto py-1.5 text-xs bg-background hover:bg-accent/50 flex-wrap gap-1",
            values.length === 0 && "text-muted-foreground",
            className,
          )}
        >
          <div className="flex flex-wrap items-center gap-1 min-w-0 flex-1">
            {values.length === 0 ? (
              <span>{placeholder}</span>
            ) : (
              values.map((v) => (
                <Badge
                  key={v}
                  variant="secondary"
                  className="text-[11px] py-0 px-1.5 gap-1 font-normal"
                >
                  {v}
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeValue(v);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.stopPropagation();
                        removeValue(v);
                      }
                    }}
                    className="hover:text-destructive cursor-pointer rounded"
                  >
                    <X className="h-3 w-3" />
                  </span>
                </Badge>
              ))
            )}
          </div>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50 ml-1" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] min-w-[220px] p-0 z-50 shadow-md border rounded-md bg-popover"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex items-center border-b px-2.5 py-1.5 gap-2 bg-muted/20">
          <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-7 text-xs border-0 shadow-none focus-visible:ring-0 px-0 bg-transparent"
          />
          {search && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-5 w-5 text-muted-foreground hover:text-foreground shrink-0"
              onClick={() => setSearch("")}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        <div
          className="max-h-60 overflow-y-auto p-1 text-xs overscroll-contain touch-pan-y"
          onWheel={(e) => e.stopPropagation()}
        >
          {showCustomOption && (
            <button
              type="button"
              className="w-full flex items-center gap-2 px-2 py-1.5 text-left rounded-sm hover:bg-primary/10 text-primary font-medium transition-colors cursor-pointer"
              onClick={() => {
                const customVal = search.trim();
                toggleOption(customVal);
                setSearch("");
              }}
            >
              <Plus className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Add &quot;{search.trim()}&quot;</span>
            </button>
          )}

          {filteredOptions.length === 0 && !showCustomOption ? (
            <div className="py-4 text-center text-xs text-muted-foreground">
              No matching options
            </div>
          ) : (
            filteredOptions.map((opt) => {
              const isSelected = values.includes(opt.value) || values.includes(opt.label);
              return (
                <button
                  key={opt.value}
                  type="button"
                  className={cn(
                    "w-full flex items-center justify-between px-2 py-1.5 text-left rounded-sm hover:bg-accent transition-colors cursor-pointer text-xs",
                    isSelected && "bg-accent/70 font-semibold text-primary",
                  )}
                  onClick={() => {
                    toggleOption(opt.value);
                  }}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0 ml-2" />}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
