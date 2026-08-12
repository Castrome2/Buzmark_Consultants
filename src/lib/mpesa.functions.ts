import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { runMpesaPush } from "./mpesa.server";

/**
 * Requests an M-Pesa payment prompt for the signed-in client.
 * Returns the transaction reference that checkout records against the order.
 */
export const requestMpesaPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        phone: z.string().min(7).max(20),
        amount: z.number().positive().max(100_000_000),
        orderNumber: z.string().min(1).max(40),
      })
      .parse(data),
  )
  .handler(async ({ data }) => runMpesaPush(data));
