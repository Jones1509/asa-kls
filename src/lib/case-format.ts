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
  const caseTitle = caseItem?.case_description?.trim();

  if (caseNumber && caseTitle) return `${caseNumber} · ${caseTitle}`;
  if (caseNumber) return caseNumber;
  if (caseTitle) return caseTitle;

  return fallback;
}
