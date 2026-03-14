import { ExecArgs } from "@medusajs/framework/types"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"

/**
 * Diagnostic script: checks and fixes shipping profile mismatches.
 *
 * The error "cart items require shipping profiles not satisfied by current shipping methods"
 * happens when products' shipping profile doesn't match the shipping option's profile.
 *
 * This script:
 * 1. Lists all shipping profiles
 * 2. Shows which profile products use vs which shipping options use
 * 3. If there's a mismatch, updates all shipping options to use the same profile as products
 */
export default async function fixShippingProfiles({ container }: ExecArgs) {
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT) as any
  const query = container.resolve(ContainerRegistrationKeys.QUERY) as any

  // 1. List all shipping profiles
  const profiles = await fulfillmentModuleService.listShippingProfiles({})
  console.log(`\nShipping Profiles (${profiles.length}):`)
  for (const p of profiles) {
    console.log(`  - ${p.id} | name: "${p.name}" | type: ${p.type}`)
  }

  // 2. Check which profile products use
  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "title", "shipping_profile.id", "shipping_profile.name"],
    pagination: { take: 10 },
  })

  const productProfileIds = new Set<string>()
  console.log(`\nProducts and their profiles (first 10):`)
  for (const p of products) {
    const profileId = p.shipping_profile?.id || "NONE"
    productProfileIds.add(profileId)
    console.log(`  - ${p.title?.substring(0, 40)} → profile: ${profileId}`)
  }

  // 3. Check which profile shipping options use
  const shippingOptions = await fulfillmentModuleService.listShippingOptions(
    {},
    { relations: ["shipping_profile"] }
  )

  console.log(`\nShipping Options (${shippingOptions.length}):`)
  for (const so of shippingOptions) {
    const profileId = so.shipping_profile_id || so.shipping_profile?.id || "NONE"
    console.log(`  - ${so.id} | "${so.name}" | provider: ${so.provider_id} | profile: ${profileId}`)
  }

  // 4. Check for mismatches
  const productProfile = [...productProfileIds][0]
  if (!productProfile || productProfile === "NONE") {
    console.log("\n⚠ Products don't have shipping profiles assigned!")
    return
  }

  const mismatchedOptions = shippingOptions.filter(
    (so: any) => so.shipping_profile_id !== productProfile && so.shipping_profile?.id !== productProfile
  )

  if (mismatchedOptions.length === 0) {
    console.log(`\n✓ All shipping options use the same profile as products (${productProfile})`)
    return
  }

  console.log(`\n⚠ MISMATCH FOUND!`)
  console.log(`  Products use profile: ${productProfile}`)
  console.log(`  Mismatched shipping options:`)
  for (const so of mismatchedOptions) {
    console.log(`    - ${so.name} (${so.id}) uses profile: ${so.shipping_profile_id}`)
  }

  // 5. Fix: update mismatched shipping options to use the product profile
  console.log(`\nFixing: updating ${mismatchedOptions.length} shipping options to use profile ${productProfile}...`)
  for (const so of mismatchedOptions) {
    await fulfillmentModuleService.updateShippingOptions({
      id: so.id,
      shipping_profile_id: productProfile,
    })
    console.log(`  ✓ Updated "${so.name}" (${so.id})`)
  }

  console.log("\nDone! Shipping profile mismatch fixed.")
}
