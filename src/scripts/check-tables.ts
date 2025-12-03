import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export default async function checkTables({ container }: { container: any }) {
  const pgConnection = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)

  try {
    // Check if recipe tables exist
    const tables = await pgConnection.raw(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name LIKE '%recipe%'
    `)

    console.log("Recipe tables found:", tables.rows)

    // Try to count recipes
    try {
      const count = await pgConnection.raw(`SELECT COUNT(*) FROM recipe`)
      console.log("Recipe count:", count.rows[0].count)
    } catch (e: any) {
      console.log("Error counting recipes:", e.message)
    }

    // Try to count recipe_products
    try {
      const count = await pgConnection.raw(`SELECT COUNT(*) FROM recipe_product`)
      console.log("RecipeProduct count:", count.rows[0].count)
    } catch (e: any) {
      console.log("Error counting recipe_products:", e.message)
    }

  } catch (error: any) {
    console.error("Error:", error.message)
  }
}
