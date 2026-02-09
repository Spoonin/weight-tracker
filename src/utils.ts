export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
}

export function formatDateFull(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

export function $(id: string): HTMLElement {
  return document.getElementById(id)!;
}

/** Parse a numeric string, accepting both dot and comma as decimal separator */
export function parseNum(value: string): number {
  return parseFloat(value.replace(',', '.'));
}

export function downloadFile(blob: Blob, filename: string) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}
