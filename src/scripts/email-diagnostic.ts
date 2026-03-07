import { ExecArgs } from "@medusajs/framework/types"
import { EMAIL_AUDIT_MODULE } from "../modules/email-audit"
import type EmailAuditModuleService from "../modules/email-audit/service"
import { Modules } from "@medusajs/framework/utils"
import { notifyWithAudit } from "../utils/notify-with-audit"

export default async function emailDiagnostic({ container }: ExecArgs) {
  console.log("=== Email Audit Diagnostic ===\n")

  // Test 1: Resolve emailAudit module
  console.log("1. Resolving emailAudit module...")
  try {
    const auditService = container.resolve(EMAIL_AUDIT_MODULE) as EmailAuditModuleService
    console.log("   OK\n")
  } catch (e: any) {
    console.error(`   FAIL: ${e.message}\n`)
  }

  // Test 2: Resolve notification module
  console.log("2. Resolving notification module...")
  try {
    const notif = container.resolve(Modules.NOTIFICATION)
    console.log(`   OK\n`)
  } catch (e: any) {
    console.error(`   FAIL: ${e.message}\n`)
  }

  // Test 3: Send a real email via notifyWithAudit
  console.log("3. Sending test email via notifyWithAudit (customer-welcome template)...")
  try {
    await notifyWithAudit(container, {
      to: process.env.SMTP_FROM || "test@test.com",
      channel: "email",
      template: "customer-welcome",
      data: {
        customer_name: "Diagnostic Test",
      },
    })
    console.log("   OK — email sent and audit logged\n")
  } catch (e: any) {
    console.error(`   FAIL: ${e.message}`)
    if (e.stack) console.error(`   Stack: ${e.stack.split("\n").slice(0, 3).join("\n   ")}`)
    console.log()
  }

  // Test 4: Check audit records
  console.log("4. Reading audit records...")
  try {
    const auditService = container.resolve(EMAIL_AUDIT_MODULE) as EmailAuditModuleService
    const [emails, count] = await auditService.listByFilters({ limit: 10 })
    console.log(`   ${count} total records:`)
    for (const e of emails) {
      console.log(`   - [${(e as any).status}] ${(e as any).email_type} → ${(e as any).to} (${(e as any).created_at})`)
    }
    console.log()
  } catch (e: any) {
    console.error(`   FAIL: ${e.message}\n`)
  }

  console.log("=== Done ===")
}
