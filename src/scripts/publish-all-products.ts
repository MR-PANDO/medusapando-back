import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { ExecArgs } from "@medusajs/framework/types"

export default async function publishAllProducts({ container }: ExecArgs) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY) as any
  const productService = container.resolve(Modules.PRODUCT) as any

  const { data: draftProducts } = await query.graph({
    entity: "product",
    fields: ["id", "title", "status"],
    filters: { status: "draft" },
  })

  console.log(`Found ${draftProducts.length} draft products`)

  if (draftProducts.length === 0) {
    console.log("No draft products to publish")
    return
  }

  let published = 0
  for (const p of draftProducts) {
    try {
      await productService.updateProducts(p.id, { status: "published" })
      published++
    } catch (err: any) {
      console.error(`Failed to publish ${p.title} (${p.id}): ${err.message}`)
    }
  }

  console.log(`Published ${published}/${draftProducts.length} products`)
}
