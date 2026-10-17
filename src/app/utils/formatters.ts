export function formatInterviewDateTime(iso: string | null): string {
  if (!iso) return "No date set";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatSalary(
  min: number | null,
  max: number | null,
  currency: string,
): string {
  if (min === null && max === null) return "Not specified";
  if (min !== null && max !== null) {
    return `${currency} ${min.toLocaleString()}–${max.toLocaleString()}`;
  }
  const value = min ?? max;
  return `${currency} ${value!.toLocaleString()}`;
}
