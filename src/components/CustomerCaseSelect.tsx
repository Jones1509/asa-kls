import { Label } from "@/components/ui/label";
import { formatCaseLabel } from "@/lib/case-format";
import { useEffect, useMemo, useState } from "react";

type CaseOption = {
  id: string;
  case_number?: string | null;
  customer?: string | null;
  customer_id?: string | null;
  case_description?: string | null;
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
          label: caseItem.customer || "Ukendt kunde",
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

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          {customerLabel}
        </Label>
        <select
          value={selectedCustomerKey}
          onChange={(e) => handleCustomerChange(e.target.value)}
          className="mt-1.5 flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none transition-all focus:ring-2 focus:ring-ring focus:ring-offset-1"
          required={required && !allowEmptyCustomer}
        >
          <option value="">{allowEmptyCustomer ? emptyCustomerLabel : customerPlaceholder}</option>
          {customers.map((customer) => (
            <option key={customer.value} value={customer.value}>
              {customer.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          {caseLabel}
        </Label>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1.5 flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none transition-all focus:ring-2 focus:ring-ring focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!selectedCustomerKey}
          required={required}
        >
          <option value="">
            {!selectedCustomerKey
              ? "Vælg først kunde..."
              : allowEmptyCase
                ? emptyCaseLabel
                : casePlaceholder}
          </option>
          {filteredCases.map((caseItem) => (
            <option key={caseItem.id} value={caseItem.id}>
              {formatCaseLabel(caseItem)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
