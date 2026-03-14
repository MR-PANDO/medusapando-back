import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { LOCATION_MODULE } from "../../../modules/location"
import LocationModuleService from "../../../modules/location/service"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const locationService: LocationModuleService = req.scope.resolve(LOCATION_MODULE)

  const departmentSlug = req.query.department as string | undefined

  // If department slug is provided, return municipalities for that department
  if (departmentSlug) {
    // Validate slug format: only lowercase letters, numbers, and hyphens
    if (!/^[a-z0-9-]+$/.test(departmentSlug)) {
      return res.status(400).json({ message: "Invalid department slug" })
    }

    const [departments] = await locationService.listAndCountDepartments(
      { slug: departmentSlug },
      { take: 1 }
    )

    if (!departments.length) {
      return res.json({ municipalities: [] })
    }

    const [municipalities] = await locationService.listAndCountMunicipalities(
      { department_id: departments[0].id },
      { take: 200, order: { name: "ASC" } }
    )

    return res.json({ municipalities })
  }

  // Otherwise return all departments
  const [departments] = await locationService.listAndCountDepartments(
    {},
    { take: 50, order: { name: "ASC" } }
  )

  res.json({ departments })
}
