// Conservative identifier screening, not comprehensive PHI detection or de-identification.
const rules: [string, RegExp][] = [
  ["email", /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi],
  ["ssn", /\b\d{3}-\d{2}-\d{4}\b/g],
  ["phone", /(?:\+1[ .-]?)?\(?\b\d{3}\)?[ .-]\d{3}[ .-]\d{4}\b/g],
  ["phone", /\b(?:phone|mobile|tel)\s*[:=]?\s*\+?\d{10,15}\b/gi],
  ["record_id", /\b(?:MRN|medical record(?: number)?|patient id)\s*[:=#]?\s*[A-Z0-9-]{3,}\b/gi],
  ["birth_date", /\b(?:DOB|date of birth|born)\s*[:=]?\s*(?:\d{1,4}[/-]\d{1,2}[/-]\d{1,4}|[A-Za-z]+\s+\d{1,2},?\s+\d{4})\b/gi],
  ["patient_name", /\b(?:[Pp]atient(?: [Nn]ame)?|[Nn]ame)\s*[:=]\s*[A-Z][a-z]+(?:[ \t]+[A-Z][a-z]+){1,3}\b/g],
  ["patient_name", /\b[Pp]atient\s+[A-Z][a-z]+(?:[ \t]+[A-Z][a-z]+){1,3}\b/g],
  ["address", /\b\d{1,6}\s+(?:[A-Za-z]+\s+){1,4}(?:Street|St|Road|Rd|Avenue|Ave|Lane|Ln|Drive|Dr|Boulevard|Blvd)\b\.?/gi],
];
export function screenText(text: string) {
  const categories = new Set<string>();
  let value = text;
  for (const [category, regex] of rules) value = value.replace(regex, () => { categories.add(category); return "[REDACTED]"; });
  return { value, categories: [...categories], detected: categories.size > 0 || /\[REDACTED\]/i.test(value) };
}
export function screenData<T>(data: T): { value: T; detected: boolean; categories: string[] } {
  const categories = new Set<string>(); let detected = false;
  function visit(value: unknown): unknown {
    if (typeof value === "string") { const checked = screenText(value); checked.categories.forEach(c => categories.add(c)); detected ||= checked.detected; return checked.value; }
    if (Array.isArray(value)) return value.map(visit);
    if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([name, item]) => [name, visit(item)]));
    return value;
  }
  const value = visit(data) as T;
  return { value, detected, categories: [...categories] };
}
export function privacyStatus(data: unknown) {
  const checked = screenData(data);
  return { detected: checked.detected, categories: checked.categories, external_ai: checked.detected ? "blocked" as const : "allowed" as const,
    notice: checked.detected ? "Possible identifiers were removed. External AI is skipped for this content. Review the redacted text and use synthetic data only." : "Pattern screening only; not comprehensive de-identification. Use synthetic data only." };
}
