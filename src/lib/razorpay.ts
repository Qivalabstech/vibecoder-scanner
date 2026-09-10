import Razorpay from "razorpay";

let client: Razorpay | null = null;

// Lazy — constructing eagerly at module load throws when key_id is unset
// (e.g. during `next build`'s page-data collection, before env is real).
export function getRazorpayClient() {
  if (!client) {
    client = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });
  }
  return client;
}

// Razorpay subscriptions require a finite total_count of billing cycles —
// there's no native "until cancelled" option. 120 months (10 years) is the
// pragmatic stand-in; cancellation is a separate explicit action either way.
export const SUBSCRIPTION_TOTAL_COUNT = 120;

export { Razorpay };
