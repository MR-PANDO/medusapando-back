import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import Anthropic from "@anthropic-ai/sdk"
import { NUTRITION_MODULE } from "../../../../../modules/nutrition"
import NutritionModuleService from "../../../../../modules/nutrition/service"

// POST /admin/nutrition/:productId/scan - Scan nutrition label image with Claude Vision
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const { productId } = req.params
    const { image_base64, image_url } = req.body as {
      image_base64?: string // Base64 encoded image data
      image_url?: string    // Or URL to image
    }

    if (!image_base64 && !image_url) {
      return res.status(400).json({
        error: "Either image_base64 or image_url is required"
      })
    }

    const anthropicApiKey = process.env.ANTHROPIC_API_KEY
    if (!anthropicApiKey || anthropicApiKey === "your_anthropic_api_key_here") {
      return res.status(500).json({
        error: "ANTHROPIC_API_KEY not configured"
      })
    }

    const nutritionService: NutritionModuleService = req.scope.resolve(NUTRITION_MODULE)

    // Initialize Claude client
    const anthropic = new Anthropic({ apiKey: anthropicApiKey })

    // Prepare image for Claude Vision
    let imageContent: any

    if (image_base64) {
      // Detect media type from base64 header or default to jpeg
      let mediaType = "image/jpeg"
      if (image_base64.startsWith("data:")) {
        const match = image_base64.match(/data:([^;]+);base64,/)
        if (match) {
          mediaType = match[1]
        }
      }

      // Remove data URL prefix if present
      const base64Data = image_base64.replace(/^data:[^;]+;base64,/, "")

      imageContent = {
        type: "image",
        source: {
          type: "base64",
          media_type: mediaType,
          data: base64Data,
        },
      }
    } else if (image_url) {
      imageContent = {
        type: "image",
        source: {
          type: "url",
          url: image_url,
        },
      }
    }

    // Call Claude Vision to extract nutrition information
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: [
            imageContent,
            {
              type: "text",
              text: `Analiza esta imagen de una etiqueta de información nutricional de un producto alimenticio.

Extrae TODA la información que puedas ver en la etiqueta y devuélvela en formato JSON.

El JSON debe tener esta estructura:
{
  "serving_size": "tamaño de la porción (ej: '1 taza (300g)', '100g')",
  "servings_per_container": "porciones por envase (ej: '6', 'aproximadamente 8')",
  "nutrition_data": {
    "calorias": "valor con unidad si aplica",
    "calorias_de_grasa": "valor si está disponible",
    "grasa_total": "valor con % si está disponible",
    "grasa_saturada": "valor",
    "grasa_trans": "valor",
    "colesterol": "valor",
    "sodio": "valor",
    "carbohidratos_totales": "valor",
    "fibra_dietetica": "valor",
    "azucares": "valor",
    "azucares_anadidos": "valor si está disponible",
    "proteina": "valor",
    "vitamina_a": "valor % si está disponible",
    "vitamina_c": "valor % si está disponible",
    "vitamina_d": "valor si está disponible",
    "calcio": "valor",
    "hierro": "valor",
    "potasio": "valor si está disponible"
  },
  "raw_text": "todo el texto visible en la etiqueta"
}

IMPORTANTE:
- Si un campo no está visible en la etiqueta, omítelo del JSON (no pongas null ni cadena vacía)
- Incluye CUALQUIER otro nutriente que veas aunque no esté en la lista anterior
- Mantén los valores exactamente como aparecen (con unidades: mg, g, %, etc.)
- Si hay información adicional como "% Valor Diario", inclúyela
- El campo nutrition_data debe ser flexible - agrega todos los campos que veas

Responde SOLO con el JSON, sin explicaciones adicionales.`
            }
          ],
        },
      ],
    })

    // Parse Claude's response
    let parsedData: any = {}
    const textContent = response.content.find((c) => c.type === "text")

    if (textContent && textContent.type === "text") {
      try {
        // Try to extract JSON from response
        let jsonStr = textContent.text.trim()

        // Remove markdown code blocks if present
        if (jsonStr.startsWith("```json")) {
          jsonStr = jsonStr.replace(/^```json\s*/, "").replace(/\s*```$/, "")
        } else if (jsonStr.startsWith("```")) {
          jsonStr = jsonStr.replace(/^```\s*/, "").replace(/\s*```$/, "")
        }

        parsedData = JSON.parse(jsonStr)
      } catch (parseError) {
        console.error("Failed to parse Claude response as JSON:", textContent.text)
        // Store raw text if JSON parsing fails
        parsedData = {
          raw_text: textContent.text,
          nutrition_data: {},
          parse_error: true
        }
      }
    }

    // Check if nutrition entry already exists for this product
    const [existing] = await nutritionService.listAndCountProductNutritions(
      { product_id: productId, deleted_at: null },
      { take: 1 }
    )

    let nutritionEntry

    if (existing.length > 0) {
      // Update existing entry (updated_at is managed automatically by Medusa)
      await nutritionService.updateProductNutritions([
        {
          id: existing[0].id,
          serving_size: parsedData.serving_size || null,
          servings_per_container: parsedData.servings_per_container || null,
          nutrition_data: parsedData.nutrition_data || {},
          raw_text: parsedData.raw_text || null,
          label_image_url: image_url || null,
          scanned_at: new Date(),
        }
      ])

      const [updated] = await nutritionService.listAndCountProductNutritions(
        { product_id: productId, deleted_at: null },
        { take: 1 }
      )
      nutritionEntry = updated[0]
    } else {
      // Create new entry (created_at, updated_at managed automatically by Medusa)
      const created = await nutritionService.createProductNutritions([
        {
          product_id: productId,
          serving_size: parsedData.serving_size || null,
          servings_per_container: parsedData.servings_per_container || null,
          nutrition_data: parsedData.nutrition_data || {},
          raw_text: parsedData.raw_text || null,
          label_image_url: image_url || null,
          scanned_at: new Date(),
        }
      ])
      nutritionEntry = created[0]
    }

    res.json({
      success: true,
      nutrition: nutritionEntry,
      extracted_data: parsedData,
    })
  } catch (error: any) {
    console.error("Error scanning nutrition label:", error)

    if (error.status === 400) {
      return res.status(400).json({
        error: "Invalid image format or Claude couldn't process the image"
      })
    }

    res.status(500).json({
      error: "Failed to scan nutrition label",
      details: error.message
    })
  }
}
