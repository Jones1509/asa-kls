import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, ChevronDown, Search } from "lucide-react";
import { formatCaseLabel } from "@/lib/case-format";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type CaseOption = {
  id: string;
  case_number?: string | null;
  customer?: string | null;
  customer_id?: string | null;
  case_description?: string | null;
  customer_number?: string | null;
};

interface CustomerCaseSelectProps {
  cases: CaseOption[];
  value: string;
  onChange: (caseId: string) => void;
  customerLabel?: string;
  caseLabel?: string;
  customerPlaceholder?: string;
  casePlaceholder?: string;
  required?: boolean;
  allowEmptyCustomer?: boolean;
  emptyCustomerLabel?: string;
  allowEmptyCase?: boolean;
  emptyCaseLabel?: string;
}

const collator = new Intl.Collator("da-DK", { numeric: true, sensitivity: "base" });

function getCustomerKey(caseItem: CaseOption) {
  return caseItem.customer_id || caseItem.customer || caseItem.id;
}

function getCustomerLabel(caseItem: CaseOption) {
  const customerName = caseItem.customer?.trim() || "Ukendt kunde";
  const customerNumber = caseItem.customer_number?.trim();
  return customerNumber ? `${customerNumber} · ${customerName}` : customerName;
}

function StyledSelect({
  options,
  value,
  onChange,
  placeholder,
  disabled = false,
  searchable = true,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  searchable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return options;
    const q = search.toLowerCase();
    return options.filter(o => o.label.toLowerCase().includes(q));
  }, [options, search]);

  const selectedLabel = options.find(o => o.value === value)?.label;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal rounded-xl h-11 mt-1.5 border-border bg-background hover:bg-muted/50 text-sm",
            !value && "text-muted-foreground",
            disabled && "opacity-60 cursor-not-allowed"
          )}
        >
          <span className="truncate">{selectedLabel || placeholder}</span>
          <ChevronDown size={14} className="ml-2 shrink-0 text-muted-foreground/50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0 w-[var(--radix-popover-trigger-width)] rounded-xl pointer-events-auto"
        align="start"
      >
        {searchable && options.length > 4 && (
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
            <Search size={14} className="text-muted-foreground shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Søg..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
              autoFocus
            />
          </div>
        )}
        <ScrollArea className="max-h-[240px]">
          <div className="p-1">
            {filtered.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false); setSearch(""); }}
                className={cn(
                  "w-full flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-left transition-colors",
                  "hover:bg-muted/60",
                  value === opt.value && "bg-primary/5 text-primary font-medium"
                )}
              >
                <span className="flex-1 truncate">{opt.label}</span>
                {value === opt.value && <Check size={14} className="shrink-0 text-primary" />}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-4 text-sm text-muted-foreground text-center">Ingen resultater</p>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

export function CustomerCaseSelect({
  cases,
  value,
  onChange,
  customerLabel = "Kunde",
  caseLabel = "Sag",
  customerPlaceholder = "Vælg kunde...",
  casePlaceholder = "Vælg sag...",
  required = false,
  allowEmptyCustomer = false,
  emptyCustomerLabel = "Ingen specifik kunde",
  allowEmptyCase = false,
  emptyCaseLabel = "Ingen specifik sag",
}: CustomerCaseSelectProps) {
  const [selectedCustomerKey, setSelectedCustomerKey] = useState("");

  const customers = useMemo(() => {
    const map = new Map<string, { value: string; label: string }>();

    cases.forEach((caseItem) => {
      const key = getCustomerKey(caseItem);
      if (!map.has(key)) {
        map.set(key, {
          value: key,
          label: getCustomerLabel(caseItem),
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => collator.compare(a.label, b.label));
  }, [cases]);

  const filteredCases = useMemo(() => {
    if (!selectedCustomerKey) return [];

    return cases
      .filter((caseItem) => getCustomerKey(caseItem) === selectedCustomerKey)
      .sort((a, b) => collator.compare(a.case_number || "", b.case_number || ""));
  }, [cases, selectedCustomerKey]);

  useEffect(() => {
    if (!value) {
      setSelectedCustomerKey("");
      return;
    }

    const selectedCase = cases.find((caseItem) => caseItem.id === value);
    if (!selectedCase) {
      setSelectedCustomerKey("");
      return;
    }

    setSelectedCustomerKey(getCustomerKey(selectedCase));
  }, [cases, value]);

  const handleCustomerChange = (nextCustomerKey: string) => {
    setSelectedCustomerKey(nextCustomerKey);

    const selectedCase = cases.find((caseItem) => caseItem.id === value);
    if (!selectedCase || getCustomerKey(selectedCase) !== nextCustomerKey) {
      onChange("");
    }
  };

  const customerOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [];
    if (allowEmptyCustomer) {
      opts.push({ value: "__empty__", label: emptyCustomerLabel });
    }
    return [...opts, ...customers];
  }, [customers, allowEmptyCustomer, emptyCustomerLabel]);

  const caseOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [];
    if (allowEmptyCase) {
      opts.push({ value: "__empty__", label: emptyCaseLabel });
    }
    return [
      ...opts,
      ...filteredCases.map((caseItem) => ({
        value: caseItem.id,
        label: formatCaseLabel(caseItem),
      })),
    ];
  }, [filteredCases, allowEmptyCase, emptyCaseLabel]);

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          {customerLabel}
        </Label>
        <StyledSelect
          options={customerOptions}
          value={selectedCustomerKey || (allowEmptyCustomer ? "__empty__" : "")}
          onChange={(v) => handleCustomerChange(v === "__empty__" ? "" : v)}
          placeholder={customerPlaceholder}
        />
      </div>

      <div>
        <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          {caseLabel}
        </Label>
        <StyledSelect
          options={caseOptions}
          value={value || (allowEmptyCase ? "__empty__" : "")}
          onChange={(v) => onChange(v === "__empty__" ? "" : v)}
          placeholder={!selectedCustomerKey ? "Vælg først kunde..." : casePlaceholder}
          disabled={!selectedCustomerKey && !allowEmptyCase}
        />
      </div>
    </div>
  );
}
