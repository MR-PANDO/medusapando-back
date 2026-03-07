import { ExecArgs } from "@medusajs/framework/types"
import { EMAIL_AUDIT_MODULE } from "../modules/email-audit"
import type EmailAuditModuleService from "../modules/email-audit/service"
import { Modules } from "@medusajs/framework/utils"
import { notifyWithAudit } from "../utils/notify-with-audit"

export default async function emailDiagnostic({ container }: ExecArgs) {
  console.log("=== Email Audit Diagnostic ===\n")

  const auditService = container.resolve(EMAIL_AUDIT_MODULE) as EmailAuditModuleService

  // Test 1: Check SMTP settings source
  console.log("1. SMTP settings source...")
  const dbSettings = await auditService.getSmtpSettings()
  if (dbSettings) {
    console.log(`   DB settings found: host=${dbSettings.host}, port=${dbSettings.port}, user=${dbSettings.user}, from=${dbSettings.from}\n`)
  } else {
    console.log(`   No DB settings — using env vars: host=${process.env.SMTP_HOST}, port=${process.env.SMTP_PORT}, user=${process.env.SMTP_USER}\n`)
  }

  // Test 2: Send a test email
  const testTo = dbSettings?.from || process.env.SMTP_FROM || "test@test.com"
  console.log(`2. Sending test email to ${testTo}...`)
  try {
    await notifyWithAudit(container, {
      to: testTo,
      channel: "email",
      template: "customer-welcome",
      data: { customer_name: "Diagnostic Test" },
    })
    console.log("   OK — email sent and audit logged\n")
  } catch (e: any) {
    console.error(`   FAIL: ${e.message}\n`)
  }

  // Test 3: Check audit records
  console.log("3. Latest audit records...")
  const [emails, count] = await auditService.listByFilters({ limit: 10 })
  console.log(`   ${count} total records:`)
  for (const e of emails) {
    console.log(`   - [${(e as any).status}] ${(e as any).email_type} → ${(e as any).to} (${(e as any).created_at})`)
  }

  console.log("\n=== Done ===")
}
