import { ExecArgs } from "@medusajs/framework/types"
import { EMAIL_AUDIT_MODULE } from "../modules/email-audit"
import type EmailAuditModuleService from "../modules/email-audit/service"
import { Modules } from "@medusajs/framework/utils"

export default async function emailDiagnostic({ container }: ExecArgs) {
  console.log("=== Email Audit Diagnostic ===\n")

  // Test 1: Resolve emailAudit module
  console.log("1. Resolving emailAudit module...")
  try {
    const auditService = container.resolve(EMAIL_AUDIT_MODULE) as EmailAuditModuleService
    console.log("   OK\n")

    // Test 2: Write a record
    console.log("2. Writing test record...")
    try {
      const record = await auditService.logEmail({
        to: "diagnostic@test.com",
        from: "system@test.com",
        subject: "Diagnostic test",
        email_type: "diagnostic",
        status: "sent",
        metadata: { test: true, ts: new Date().toISOString() },
        sent_at: new Date(),
      })
      console.log(`   OK — id: ${record.id}\n`)
    } catch (e: any) {
      console.error(`   FAIL: ${e.message}\n`)
    }

    // Test 3: Read records
    console.log("3. Reading records...")
    try {
      const [emails, count] = await auditService.listByFilters({ limit: 5 })
      console.log(`   OK — ${count} total records`)
      for (const e of emails) {
        console.log(`   - [${(e as any).status}] ${(e as any).email_type} → ${(e as any).to} (${(e as any).created_at})`)
      }
      console.log()
    } catch (e: any) {
      console.error(`   FAIL: ${e.message}\n`)
    }
  } catch (e: any) {
    console.error(`   FAIL: ${e.message}\n`)
  }

  // Test 4: Resolve notification module
  console.log("4. Resolving notification module...")
  try {
    const notif = container.resolve(Modules.NOTIFICATION)
    console.log(`   OK — ${notif ? "resolved" : "null"}\n`)
  } catch (e: any) {
    console.error(`   FAIL: ${e.message}\n`)
  }

  console.log("=== Done ===")
}
