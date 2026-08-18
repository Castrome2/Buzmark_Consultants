/**
 * M-Pesa service helpers (shared by client UI and the server function).
 * Placeholder paybill/till/bank numbers — edit these to your real ones.
 */

export const PAYMENT_ACCOUNTS = {
  tillNumber: "832 4517",
  paybill: "400 200",
  paybillAccount: "BUZMARK",
  bankName: "Equity Bank Kenya",
  bankBranch: "Nairobi CBD",
  bankAccountName: "Buzmark Marketing & Consulting Consultants",
  bankAccountNumber: "0170 2915 3374 21",
  swift: "EQBLKENA",
} as const;

/** Normalise any Kenyan phone input to the 2547XXXXXXXX / 2541XXXXXXXX format. */
export function normalizeMpesaPhone(input: string): string | null {
  const digits = (input ?? "").replace(/\D/g, "");
  let msisdn = digits;
  if (msisdn.startsWith("0")) msisdn = `254${msisdn.slice(1)}`;
  else if (msisdn.startsWith("7") || msisdn.startsWith("1")) msisdn = `254${msisdn}`;
  else if (msisdn.startsWith("2540")) msisdn = `254${msisdn.slice(4)}`;
  if (!/^254(7|1)\d{8}$/.test(msisdn)) return null;
  return msisdn;
}

export function maskPhone(msisdn: string | null | undefined) {
  if (!msisdn) return "—";
  return msisdn.length > 6 ? `${msisdn.slice(0, 6)}***${msisdn.slice(-3)}` : msisdn;
}

/** Buzmark-style M-Pesa receipt reference, e.g. BZM7KQ4T2X. */
export function buildMpesaReference() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789";
  let tail = "";
  for (let i = 0; i < 7; i += 1) {
    tail += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `BZM${tail}`;
}

export type MpesaPushResult = {
  reference: string;
  msisdn: string;
  amount: number;
  tillNumber: string;
  requestedAt: string;
  message: string;
};
