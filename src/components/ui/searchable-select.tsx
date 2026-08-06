import * as React from "react";
import { Check, ChevronsUpDown, Plus, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type Option = {
  label: string;
  value: string;
};

interface SearchableSelectProps {
  options: Option[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  allowCustom?: boolean;
  className?: string;
  disabled?: boolean;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Select or type...",
  searchPlaceholder = "Search...",
  allowCustom = true,
  className,
  disabled = false,
}: SearchableSelectProps) {
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

  const selectedOption = React.useMemo(() => {
    return options.find((opt) => opt.value === value || opt.label === value);
  }, [options, value]);

  const displayLabel = selectedOption
    ? selectedOption.label
    : value || placeholder;

  const showCustomOption =
    allowCustom &&
    search.trim().length > 0 &&
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
            "w-full justify-between font-normal text-left h-9 text-xs bg-background hover:bg-accent/50",
            !value && "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate">{displayLabel}</span>
          <div className="flex items-center gap-1 shrink-0 ml-1">
            {value && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange("");
                  setSearch("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.stopPropagation();
                    onChange("");
                    setSearch("");
                  }
                }}
                className="text-muted-foreground hover:text-foreground rounded p-0.5"
                title="Clear"
              >
                <X className="h-3 w-3" />
              </span>
            )}
            <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
          </div>
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
                onChange(customVal);
                setOpen(false);
                setSearch("");
              }}
            >
              <Plus className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Use &quot;{search.trim()}&quot;</span>
            </button>
          )}

          {filteredOptions.length === 0 && !showCustomOption ? (
            <div className="py-4 text-center text-xs text-muted-foreground">
              No matching options
            </div>
          ) : (
            filteredOptions.map((opt) => {
              const isSelected = value === opt.value || value === opt.label;
              return (
                <button
                  key={opt.value}
                  type="button"
                  className={cn(
                    "w-full flex items-center justify-between px-2 py-1.5 text-left rounded-sm hover:bg-accent transition-colors cursor-pointer text-xs",
                    isSelected && "bg-accent/70 font-semibold text-primary",
                  )}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                    setSearch("");
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
