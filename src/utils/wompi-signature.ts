import crypto from "crypto"

/**
 * Validates Wompi webhook signature using SHA-256.
 * Uses timing-safe comparison to prevent timing attacks.
 *
 * Algorithm (per Wompi docs):
 * 1. Read signature.properties array from payload
 * 2. Resolve each property path against payload.data
 * 3. Concatenate: values + timestamp + events_secret
 * 4. SHA-256 hash the concatenated string
 * 5. Compare against signature.checksum
 */
export function validateWompiSignature(
  payload: {
    data: Record<string, any>
    signature: { properties: string[]; checksum: string }
    timestamp: number
  },
  eventsSecret: string
): boolean {
  const { signature, timestamp, data } = payload

  if (
    !signature?.properties ||
    !Array.isArray(signature.properties) ||
    !signature?.checksum ||
    typeof timestamp !== "number"
  ) {
    return false
  }

  // Resolve property paths dynamically (never hardcode)
  const values = signature.properties.map((prop: string) => {
    const parts = prop.split(".")
    let value: any = data
    for (const part of parts) {
      value = value?.[part]
    }
    return String(value ?? "")
  })

  const concatenated = [
    ...values,
    String(timestamp),
    eventsSecret,
  ].join("")

  const computed = crypto
    .createHash("sha256")
    .update(concatenated)
    .digest("hex")

  // Timing-safe comparison to prevent timing attacks
  try {
    const computedBuf = Buffer.from(computed, "hex")
    const checksumBuf = Buffer.from(signature.checksum, "hex")

    if (computedBuf.length !== checksumBuf.length) {
      return false
    }

    return crypto.timingSafeEqual(computedBuf, checksumBuf)
  } catch {
    return false
  }
}
