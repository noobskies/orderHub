import { createHmac } from "crypto";

/**
 * Generate HMAC signature for webhook payload
 */
export function generateWebhookSignature(
  payload: string,
  secret: string,
): string {
  const hmac = createHmac("sha256", secret);
  hmac.update(payload);
  return `sha256=${hmac.digest("hex")}`;
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  try {
    const expectedSignature = generateWebhookSignature(payload, secret);

    // Use timingSafeEqual to prevent timing attacks
    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (sigBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return sigBuffer.equals(expectedBuffer);
  } catch (error) {
    console.error("Webhook signature verification error:", error);
    return false;
  }
}

/**
 * Extract signature from header
 */
export function extractSignatureFromHeader(
  header: string | null,
): string | null {
  if (!header) return null;

  // Support both "sha256=..." and "sha256 ..." formats
  const regex = /sha256[=\s]([a-f0-9]{64})/i;
  const match = regex.exec(header);
  return match ? `sha256=${match[1]}` : null;
}

/**
 * Validate webhook request signature
 */
export function validateWebhookRequest(
  payload: string,
  signatureHeader: string | null,
  secret: string,
): { valid: boolean; error?: string } {
  if (!signatureHeader) {
    return { valid: false, error: "Missing signature header" };
  }

  const signature = extractSignatureFromHeader(signatureHeader);
  if (!signature) {
    return { valid: false, error: "Invalid signature format" };
  }

  const isValid = verifyWebhookSignature(payload, signature, secret);
  if (!isValid) {
    return { valid: false, error: "Invalid signature" };
  }

  return { valid: true };
}
