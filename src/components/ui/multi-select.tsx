import * as React from "react";
import { ChevronDown, Check, X, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

export interface Option {
  label: string;
  value: string;
  badge?: React.ReactNode;
}

export interface MultiSelectProps {
  options: Option[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  allLabel?: string;
  className?: string;
  showSearch?: boolean;
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "Select items...",
  allLabel = "All selected",
  className,
  showSearch = false,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const toggleOption = (val: string) => {
    if (value.includes(val)) {
      onChange(value.filter((v) => v !== val));
    } else {
      onChange([...value, val]);
    }
  };

  const selectAll = () => {
    onChange(options.map((o) => o.value));
  };

  const clearAll = () => {
    onChange([]);
  };

  const filteredOptions = React.useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, search]);

  const selectedLabels = React.useMemo(() => {
    return options.filter((o) => value.includes(o.value)).map((o) => o.label);
  }, [options, value]);

  const triggerLabel = React.useMemo(() => {
    if (value.length === 0) return `All (${options.length})`;
    if (value.length === options.length) return allLabel;
    if (value.length <= 2) return selectedLabels.join(", ");
    return `${value.length} selected`;
  }, [value, options.length, allLabel, selectedLabels]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between font-normal text-left h-10 px-3 hover:bg-background",
            value.length === 0 && "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate flex-1 min-w-0 pr-2">{triggerLabel}</span>
          <div className="flex items-center gap-1 shrink-0">
            {value.length > 0 && (
              <Badge
                variant="secondary"
                className="h-5 px-1.5 text-[11px] font-normal"
              >
                {value.length}
              </Badge>
            )}
            <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] min-w-60 p-0"
        align="start"
        data-radix-scroll-lock-ignore
      >
        {showSearch && options.length > 5 && (
          <div className="flex items-center border-b px-3 py-2">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 border-none focus-visible:ring-0 p-0 text-xs"
            />
            {search && (
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 p-0"
                onClick={() => setSearch("")}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}

        <div className="flex items-center justify-between border-b px-3 py-2 text-xs text-muted-foreground bg-muted/30">
          <span>
            {value.length === 0
              ? "Showing all"
              : `${value.length} of ${options.length} selected`}
          </span>
          <div className="flex gap-2">
            {value.length < options.length && (
              <button
                type="button"
                onClick={selectAll}
                className="text-primary hover:underline font-medium"
              >
                Select all
              </button>
            )}
            {value.length > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="text-destructive hover:underline font-medium"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div
          className="max-h-60 overflow-y-auto p-1 space-y-0.5 overscroll-contain"
          data-radix-scroll-lock-ignore
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
          {filteredOptions.length === 0 ? (
            <div className="py-4 text-center text-xs text-muted-foreground">
              No options found
            </div>
          ) : (
            filteredOptions.map((option) => {
              const isChecked = value.includes(option.value);
              return (
                <div
                  key={option.value}
                  onClick={() => toggleOption(option.value)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-sm px-2.5 py-1.5 text-xs cursor-pointer select-none transition-colors hover:bg-accent hover:text-accent-foreground",
                    isChecked && "bg-accent/50 font-medium",
                  )}
                >
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={() => toggleOption(option.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="flex-1 truncate">{option.label}</span>
                  {/* {option.badge} */}
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
