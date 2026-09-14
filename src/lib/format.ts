const INR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

export function formatInr(amountInr: number): string {
  const abs = Math.abs(amountInr);
  if (abs >= 1_00_00_000) {
    const crore = amountInr / 1_00_00_000;
    return `₹${crore.toFixed(2)} Cr`;
  }
  if (abs >= 1_00_000) {
    const lakh = amountInr / 1_00_000;
    return `₹${lakh.toFixed(1)}L`;
  }
  return INR.format(amountInr);
}

export function formatPercent(value: number, digits = 0): string {
  return `${value.toFixed(digits)}%`;
}

export function formatScore(value: number, max = 100): string {
  return `${Math.round(value)} / ${max}`;
}

export function formatMultiple(value: number): string {
  return `${value.toFixed(2)}x`;
}

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function partsInIst(iso: string) {
  const date = new Date(iso);
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const map = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value]),
  );
  return {
    year: map.year,
    month: months[Number(map.month) - 1],
    day: map.day,
    hour: map.hour,
    minute: map.minute,
  };
}

export function formatDateTime(iso: string): string {
  const p = partsInIst(iso);
  return `${p.day} ${p.month} ${p.year}, ${p.hour}:${p.minute} IST`;
}

export function formatDate(iso: string): string {
  const p = partsInIst(iso);
  return `${p.day} ${p.month} ${p.year}`;
}
