import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

/**
 * Booking now lives as a tab inside the client dashboard.
 * This route only forwards old links (and service "Request" links) there.
 */
export const Route = createFileRoute("/book")({
  validateSearch: z.object({ service: z.string().optional() }),
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/dashboard",
      search: { tab: "book", service: search.service },
    });
  },
  component: () => null,
});
