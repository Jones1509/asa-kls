export type CaseLabelLike = {
  case_number?: string | null;
  case_description?: string | null;
  customer?: string | null;
};

export function getCaseTitle(caseItem?: CaseLabelLike | null, fallback = "–") {
  const title = caseItem?.case_description?.trim();
  if (title) return title;
  return fallback;
}

export function formatCaseLabel(caseItem?: CaseLabelLike | null, fallback = "–") {
  const caseNumber = caseItem?.case_number?.trim();
  const customer = caseItem?.customer?.trim();
  const caseTitle = caseItem?.case_description?.trim();

  const parts = [caseNumber, customer, caseTitle].filter(Boolean);
  if (parts.length > 0) return parts.join(" · ");

  return fallback;
}
