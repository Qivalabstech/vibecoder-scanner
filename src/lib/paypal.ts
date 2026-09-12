// Thin fetch-based PayPal REST client — no SDK, mirrors the previous
// razorpay.ts's directness. PayPal has no Node "official" client that's
// meaningfully better than calling the REST API directly.

const PAYPAL_API_BASE =
  process.env.PAYPAL_ENV === "sandbox"
    ? "https://api-m.sandbox.paypal.com"
    : "https://api-m.paypal.com";

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getPaypalAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.value;
  }

  const clientId = process.env.PAYPAL_CLIENT_ID!;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET!;
  const res = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    throw new Error(`PayPal token request failed: ${res.status} ${await res.text()}`);
  }

  const json = (await res.json()) as { access_token: string; expires_in: number };
  // Refresh a little early rather than exactly at expiry.
  cachedToken = { value: json.access_token, expiresAt: Date.now() + (json.expires_in - 60) * 1000 };
  return cachedToken.value;
}

async function paypalFetch(path: string, init: RequestInit = {}) {
  const token = await getPaypalAccessToken();
  const res = await fetch(`${PAYPAL_API_BASE}${path}`, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  return res;
}

export interface PaypalSubscription {
  id: string;
  status: string;
}

export async function createPaypalSubscription(planId: string, userId: string): Promise<PaypalSubscription> {
  const res = await paypalFetch("/v1/billing/subscriptions", {
    method: "POST",
    body: JSON.stringify({
      plan_id: planId,
      custom_id: userId,
      application_context: {
        shipping_preference: "NO_SHIPPING",
        user_action: "SUBSCRIBE_NOW",
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`PayPal subscription create failed: ${res.status} ${await res.text()}`);
  }

  return res.json();
}

export async function cancelPaypalSubscription(subscriptionId: string, reason: string): Promise<void> {
  const res = await paypalFetch(`/v1/billing/subscriptions/${subscriptionId}/cancel`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });

  // 204 on success; PayPal also 422s if it's already cancelled/expired —
  // treat that as a no-op success since the end state is what we want.
  if (!res.ok && res.status !== 422) {
    throw new Error(`PayPal subscription cancel failed: ${res.status} ${await res.text()}`);
  }
}

// PayPal's webhook signature check isn't a local HMAC — it's a call back
// to PayPal with the transmission headers + the raw event body, and
// PayPal tells you whether it's genuine. Needs PAYPAL_WEBHOOK_ID (the
// webhook's ID from the PayPal dashboard, not a secret).
export async function verifyPaypalWebhookSignature(
  headers: {
    transmissionId: string | null;
    transmissionTime: string | null;
    certUrl: string | null;
    authAlgo: string | null;
    transmissionSig: string | null;
  },
  rawBody: string
): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (
    !webhookId ||
    !headers.transmissionId ||
    !headers.transmissionTime ||
    !headers.certUrl ||
    !headers.authAlgo ||
    !headers.transmissionSig
  ) {
    return false;
  }

  const res = await paypalFetch("/v1/notifications/verify-webhook-signature", {
    method: "POST",
    body: JSON.stringify({
      transmission_id: headers.transmissionId,
      transmission_time: headers.transmissionTime,
      cert_url: headers.certUrl,
      auth_algo: headers.authAlgo,
      transmission_sig: headers.transmissionSig,
      webhook_id: webhookId,
      webhook_event: JSON.parse(rawBody),
    }),
  });

  if (!res.ok) return false;
  const json = (await res.json()) as { verification_status: string };
  return json.verification_status === "SUCCESS";
}
