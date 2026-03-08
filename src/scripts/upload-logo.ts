import { ExecArgs } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import * as fs from "fs"
import * as path from "path"

/**
 * Upload logo.png to MinIO/S3 via Medusa's file module.
 *
 * Usage (from .medusa/server/):
 *   npx medusa exec ./src/scripts/upload-logo.js
 *
 * The logo file should be placed at the project root as "logo.png"
 * before building, or pass a path via LOGO_PATH env var.
 */
export default async function uploadLogo({ container }: ExecArgs) {
  const fileService = container.resolve(Modules.FILE) as any

  // Try multiple possible locations for the logo file
  const candidates = [
    process.env.LOGO_PATH,
    path.resolve(process.cwd(), "logo.png"),
    path.resolve(process.cwd(), "../../logo.png"),
    path.resolve(process.cwd(), "../../../medusapando-front/public/logo.png"),
  ].filter(Boolean) as string[]

  let logoPath: string | null = null
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      logoPath = p
      break
    }
  }

  if (!logoPath) {
    console.error("logo.png not found. Searched:", candidates)
    console.error("Set LOGO_PATH env var or place logo.png in the project root.")
    return
  }

  console.log(`Found logo at: ${logoPath}`)

  const fileBuffer = fs.readFileSync(logoPath)
  const base64 = fileBuffer.toString("base64")
  const dataUri = `data:image/png;base64,${base64}`

  // Convert base64 to a binary string for Medusa's file upload
  const binary = Buffer.from(base64, "base64")

  console.log(`Uploading logo (${(binary.length / 1024).toFixed(1)} KB)...`)

  try {
    const result = await fileService.createFiles({
      files: [
        {
          filename: "logo.png",
          mimeType: "image/png",
          content: dataUri,
          access: "public",
        },
      ],
    })

    const uploaded = Array.isArray(result) ? result[0] : result
    const url = uploaded?.url || uploaded?.file_url || JSON.stringify(uploaded)

    console.log(`\nLogo uploaded successfully!`)
    console.log(`URL: ${url}`)
    console.log(`\nUpdate STORE_LOGO_URL in shared.ts or set EMAIL_LOGO_URL env var to this URL.`)
  } catch (err: any) {
    console.error("Upload failed:", err.message)
    console.error("Full error:", err)
  }
}
