import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MeiliSearch } from "meilisearch"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const productService = req.scope.resolve("product")

    // Initialize Meilisearch client
    const meiliClient = new MeiliSearch({
      host: process.env.MEILISEARCH_HOST || "http://localhost:7700",
      apiKey: process.env.MEILISEARCH_API_KEY || "",
    })

    // Fetch all products with variants
    const [products] = await productService.listAndCountProducts(
      { status: ["published"] },
      {
        relations: ["variants", "images"],
        take: 1000,
      }
    )

    if (products.length === 0) {
      return res.json({ success: true, message: "No products to sync", count: 0 })
    }

    // Transform products for Meilisearch
    const documents = products.map((product: any) => ({
      id: product.id,
      title: product.title,
      description: product.description,
      handle: product.handle,
      thumbnail: product.thumbnail || product.images?.[0]?.url || null,
      variant_sku: product.variants?.map((v: any) => v.sku).filter(Boolean).join(" ") || "",
      variant_id: product.variants?.[0]?.id || null, // Default to first variant
    }))

    // Get or create the products index
    const index = meiliClient.index("products")

    // Add documents to Meilisearch
    const task = await index.addDocuments(documents, { primaryKey: "id" })

    // Update searchable attributes
    await index.updateSettings({
      searchableAttributes: ["title", "description", "variant_sku", "handle"],
      displayedAttributes: ["id", "title", "description", "variant_sku", "thumbnail", "handle", "variant_id"],
    })

    return res.json({
      success: true,
      message: `Synced ${products.length} products to Meilisearch`,
      count: products.length,
      taskUid: task.taskUid,
    })
  } catch (error: any) {
    console.error("Meilisearch sync error:", error)
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to sync products",
    })
  }
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  // Allow GET for easy browser testing
  return POST(req, res)
}
