import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { z } from "zod";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Add date formatting utility
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('es-PE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

// Add number formatting utility for currency and Bitcoin
export function formatCurrency(amount: number, currency: string = 'PEN'): string {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency,
  }).format(amount);
}

export function formatBitcoin(amount: number): string {
  return new Intl.NumberFormat('es-PE', {
    minimumFractionDigits: 8,
    maximumFractionDigits: 8,
  }).format(amount);
}

// Bitcoin price schema for type safety
export const bitcoinPriceSchema = z.object({
  bitcoin: z.object({
    pen: z.number(),
    provider: z.string(),
    timestamp: z.number()
  })
});

export type BitcoinPrice = z.infer<typeof bitcoinPriceSchema>;