export type CustomerCaseOption = {
  id: string;
  case_number?: string | null;
  customer?: string | null;
  customer_id?: string | null;
  case_description?: string | null;
  customer_number?: string | null;
};

export function normalizeCaseOptions(data: any[] | null | undefined): CustomerCaseOption[] {
  return (data || []).map((caseItem: any) => ({
    ...caseItem,
    customer_number:
      caseItem?.customer_number ??
      caseItem?.customers?.customer_number ??
      null,
  }));
}
