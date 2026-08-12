import {
  PAYMENT_ACCOUNTS,
  buildMpesaReference,
  normalizeMpesaPhone,
  type MpesaPushResult,
} from "./mpesa";

/**
 * Server-side M-Pesa push.
 * When Daraja credentials are configured this is where the STK push goes out;
 * until then we issue a Buzmark reference the admin reconciles against the till.
 */
export async function runMpesaPush(input: {
  phone: string;
  amount: number;
  orderNumber: string;
}): Promise<MpesaPushResult> {
  const msisdn = normalizeMpesaPhone(input.phone);
  if (!msisdn) throw new Error("Enter a valid Kenyan M-Pesa number, e.g. 0712 345 678.");
  if (input.amount <= 0) throw new Error("Nothing to pay on this order.");

  const reference = buildMpesaReference();
  return {
    reference,
    msisdn,
    amount: Math.round(input.amount),
    tillNumber: PAYMENT_ACCOUNTS.tillNumber,
    requestedAt: new Date().toISOString(),
    message: `Enter the M-Pesa PIN on ${msisdn} to pay KES ${Math.round(
      input.amount,
    ).toLocaleString("en-KE")} to Buzmark till ${PAYMENT_ACCOUNTS.tillNumber} for ${input.orderNumber}.`,
  };
}
