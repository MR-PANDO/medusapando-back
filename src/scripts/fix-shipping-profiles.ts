import { ExecArgs } from "@medusajs/framework/types"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"

/**
 * Assigns ALL products to the default shipping profile.
 *
 * Products without a shipping profile cause "cart items require shipping profiles
 * not satisfied by current shipping methods" error on order completion.
 */
export default async function fixShippingProfiles({ container }: ExecArgs) {
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT) as any
  const productService = container.resolve(Modules.PRODUCT) as any
  const link = container.resolve(ContainerRegistrationKeys.LINK) as any

  // 1. Get the default shipping profile
  const profiles = await fulfillmentModuleService.listShippingProfiles({ type: "default" })
  if (profiles.length === 0) {
    console.log("No default shipping profile found!")
    return
  }
  const defaultProfile = profiles[0]
  console.log(`Default Shipping Profile: ${defaultProfile.id} ("${defaultProfile.name}")`)

  // 2. Get ALL products
  const products = await productService.listProducts({}, { take: 9999 })
  console.log(`Total products: ${products.length}`)

  // 3. Check which products already have a profile link
  const query = container.resolve(ContainerRegistrationKeys.QUERY) as any
  const { data: linkedProducts } = await query.graph({
    entity: "product",
    fields: ["id", "shipping_profile.id"],
    pagination: { take: 9999 },
  })

  const productsWithProfile = new Set(
    linkedProducts
      .filter((p: any) => p.shipping_profile?.id)
      .map((p: any) => p.id)
  )

  const productsWithoutProfile = products.filter(
    (p: any) => !productsWithProfile.has(p.id)
  )

  console.log(`Products with profile: ${productsWithProfile.size}`)
  console.log(`Products WITHOUT profile: ${productsWithoutProfile.length}`)

  if (productsWithoutProfile.length === 0) {
    console.log("\n✓ All products already have a shipping profile!")
    return
  }

  // 4. Link all unlinked products to the default shipping profile
  console.log(`\nAssigning ${productsWithoutProfile.length} products to "${defaultProfile.name}"...`)

  let linked = 0
  let errors = 0

  for (const product of productsWithoutProfile) {
    try {
      await link.create({
        [Modules.PRODUCT]: { product_id: product.id },
        [Modules.FULFILLMENT]: { shipping_profile_id: defaultProfile.id },
      })
      linked++
    } catch (err: any) {
      // Link might already exist
      if (err.message?.includes("already exists")) {
        linked++
      } else {
        errors++
        if (errors <= 3) {
          console.error(`  Error linking ${product.title}: ${err.message}`)
        }
      }
    }
  }

  console.log(`\n✓ Done! Linked ${linked} products. Errors: ${errors}`)
}
