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
              text: `Analiza esta imagen de una etiqueta de información nutricional.

Extrae la información y devuélvela en formato JSON con esta estructura EXACTA:

{
  "serving_size": "tamaño de porción",
  "servings_per_container": "porciones por envase",
  "nutrition_data": {
    "calorias": "100 kcal | 30 kcal",
    "grasa_total": "5g | 1.5g",
    "proteina": "3g | 1g"
  }
}

REGLAS CRÍTICAS - LEE CON CUIDADO:

1. CADA nutriente debe ser UN SOLO CAMPO con ambos valores separados por " | "
   - CORRECTO: "azucares_totales": "1.7g | 1.5g"
   - INCORRECTO: "azucares_totales_por_100g": "1.7g" (NO crear campos separados)
   - INCORRECTO: "azucares_totales_por_porcion": "1.5g" (NO crear campos separados)

2. El formato SIEMPRE es: "nombre_nutriente": "valor_100g | valor_porcion"
   - Primer valor = Por 100g
   - Segundo valor = Por porción
   - Separados por " | " (espacio, barra vertical, espacio)

3. NUNCA incluyas "por_100g" o "por_porcion" en el NOMBRE del campo
   - CORRECTO: "calcio": "85mg | 77mg"
   - INCORRECTO: "calcio_por_100g": "85mg"

4. Nombres de nutrientes permitidos (solo estos, en minúsculas con guiones bajos):
   calorias, grasa_total, grasa_saturada, grasa_trans, colesterol, sodio,
   carbohidratos_totales, fibra_dietetica, azucares_totales, azucares_anadidos,
   proteina, vitamina_a, vitamina_c, vitamina_d, vitamina_e, vitamina_b12,
   calcio, hierro, potasio, magnesio, zinc, fosforo

5. Si solo hay una columna en la etiqueta, pon solo ese valor sin " | "

Responde SOLO con el JSON válido, sin explicaciones.`
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

        // Post-process nutrition_data to merge duplicated fields into single entries
        if (parsedData.nutrition_data) {
          const cleanedData: Record<string, string> = {}
          const nutritionData = parsedData.nutrition_data

          // Collect all base nutrient names and their values
          const nutrientValues: Record<string, { por100g?: string; porPorcion?: string; combined?: string }> = {}

          for (const [key, value] of Object.entries(nutritionData)) {
            const strValue = String(value).trim()
            const lowerKey = key.toLowerCase()

            // Detect various patterns for "por 100g" and "por porcion" suffixes
            const por100gPatterns = ["_por_100g", "_por_100_g", "_100g", "_por100g"]
            const porPorcionPatterns = ["_por_porcion", "_por_porción", "_porcion", "_porción"]

            let baseName = lowerKey
            let isPor100g = false
            let isPorPorcion = false

            // Check for por_100g patterns
            for (const pattern of por100gPatterns) {
              if (lowerKey.endsWith(pattern)) {
                baseName = lowerKey.slice(0, -pattern.length)
                isPor100g = true
                break
              }
            }

            // Check for por_porcion patterns
            if (!isPor100g) {
              for (const pattern of porPorcionPatterns) {
                if (lowerKey.endsWith(pattern)) {
                  baseName = lowerKey.slice(0, -pattern.length)
                  isPorPorcion = true
                  break
                }
              }
            }

            // Initialize nutrient entry if needed
            if (!nutrientValues[baseName]) {
              nutrientValues[baseName] = {}
            }

            if (isPor100g) {
              nutrientValues[baseName].por100g = strValue
            } else if (isPorPorcion) {
              nutrientValues[baseName].porPorcion = strValue
            } else {
              // This is either a combined value (with |) or needs to be checked
              if (strValue.includes("|")) {
                nutrientValues[baseName].combined = strValue
              } else {
                // If we already have this base nutrient, this might be a duplicate
                // Store as combined for now
                if (!nutrientValues[baseName].combined) {
                  nutrientValues[baseName].combined = strValue
                }
              }
            }
          }

          // Build final cleaned data
          for (const [nutrient, values] of Object.entries(nutrientValues)) {
            // Priority 1: If we have a properly formatted combined value with |
            if (values.combined && values.combined.includes("|")) {
              cleanedData[nutrient] = values.combined
            }
            // Priority 2: If we have both por100g and porPorcion, combine them
            else if (values.por100g && values.porPorcion) {
              cleanedData[nutrient] = `${values.por100g} | ${values.porPorcion}`
            }
            // Priority 3: If we only have por100g
            else if (values.por100g) {
              cleanedData[nutrient] = values.por100g
            }
            // Priority 4: If we only have porPorcion
            else if (values.porPorcion) {
              cleanedData[nutrient] = `- | ${values.porPorcion}`
            }
            // Priority 5: Use combined value as-is
            else if (values.combined) {
              cleanedData[nutrient] = values.combined
            }
          }

          parsedData.nutrition_data = cleanedData
        }
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
