import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"

export default async function productUpdatedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const storefrontUrl = process.env.STOREFRONT_URL

  if (!storefrontUrl) {
    console.warn("STOREFRONT_URL not set, skipping cache revalidation")
    return
  }

  try {
    // Revalidate products cache in Next.js storefront
    await fetch(`${storefrontUrl}/api/revalidate?tags=products`, {
      method: "GET",
    })
    console.log(`Cache revalidated for product ${data.id}`)
  } catch (error) {
    console.error("Failed to revalidate storefront cache:", error)
  }
}

export const config: SubscriberConfig = {
  event: "product.updated",
}
