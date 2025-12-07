import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ANALYTICS_MODULE } from "../../../../modules/analytics"

type TrackRequestBody = {
  session_id: string
  page_path: string
  referrer?: string
  user_agent?: string
  country_code?: string
  customer_id?: string
}

export async function POST(
  req: MedusaRequest<TrackRequestBody>,
  res: MedusaResponse
) {
  try {
    const analyticsService = req.scope.resolve(ANALYTICS_MODULE)
    const { session_id, page_path, referrer, user_agent, country_code, customer_id } = req.body

    if (!session_id || !page_path) {
      return res.status(400).json({ error: "session_id and page_path are required" })
    }

    const pageView = await analyticsService.createPageViews({
      session_id,
      page_path,
      referrer: referrer || null,
      user_agent: user_agent || null,
      country_code: country_code || null,
      customer_id: customer_id || null,
      viewed_at: new Date(),
    })

    return res.status(201).json({ success: true, id: pageView.id })
  } catch (error: any) {
    console.error("Error tracking page view:", error)
    return res.status(500).json({ error: error.message })
  }
}
