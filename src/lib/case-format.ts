export type CaseLabelLike = {
  case_number?: string | null;
  customer?: string | null;
};

export function formatCaseLabel(caseItem?: CaseLabelLike | null, fallback = "–") {
  if (!caseItem?.case_number) return fallback;
  const customerName = caseItem.customer?.trim();
  return customerName ? `${caseItem.case_number} (${customerName})` : caseItem.case_number;
}
