import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"

/**
 * When a content translation is created/updated, revalidate the storefront cache
 * so Next.js serves fresh translated content.
 *
 * MeiliSearch re-indexing for translated fields should be triggered separately
 * via POST /admin/meilisearch/sync after bulk translation changes,
 * or the product can be re-saved in admin to trigger the plugin's subscriber.
 */
export default async function translationUpdatedHandler({
  event: { data },
}: SubscriberArgs<{ entity_type: string; entity_id: string }>) {
  const storefrontUrl = process.env.STOREFRONT_URL

  if (!storefrontUrl) {
    return
  }

  try {
    // Revalidate products/categories cache in Next.js storefront
    const tag = data.entity_type === "product" ? "products" : "categories"
    await fetch(`${storefrontUrl}/api/revalidate?tags=${tag}`, {
      method: "GET",
    })
    console.log(`Cache revalidated for ${data.entity_type} translation ${data.entity_id}`)
  } catch (error) {
    console.error("Failed to revalidate storefront cache:", error)
  }
}

export const config: SubscriberConfig = {
  event: "content-translation.updated",
}
