# Password Recovery

Customer password reset flow using Medusa v2's built-in `auth.password_reset` event.

## Flow Overview

```
User clicks "Forgot password?"
        |
        v
Frontend: requestPasswordReset(email)
  -> sdk.auth.resetPassword("customer", "emailpass", { identifier: email })
        |
        v
Backend: Medusa emits "auth.password_reset" event
  -> Subscriber: password-reset.ts
  -> Email: password-reset template via notifyWithAudit()
        |
        v
User clicks link in email
  -> GET /{countryCode}/reset-password?token=...&email=...
        |
        v
Frontend: resetPassword(token, email, newPassword)
  -> sdk.auth.updateProvider("customer", "emailpass", { email, password }, token)
        |
        v
Password updated. User redirected to login.
```

## Backend

### Subscriber

**File:** `src/subscribers/password-reset.ts`

Listens to `auth.password_reset`. Only handles `actor_type === "customer"` (ignores admin resets).

Builds the reset URL: `{STOREFRONT_URL}/co/reset-password?token={token}&email={entity_id}`

Sends email via `notifyWithAudit()` using the `password-reset` template.

### Email Template

**File:** `src/modules/smtp-notification/templates/password-reset.ts`

- Subject: "Restablecer tu contrasena - Vita Integral"
- Lock icon, CTA button linking to the reset URL
- Warning box: "Este enlace expira en 1 hora"
- Uses `emailWrapper()` from `shared.ts`

### SMTP Provider Case

**File:** `src/modules/smtp-notification/service.ts`

```typescript
case "password-reset": {
  subject = passwordResetSubject()
  html = passwordResetTemplate(data as any)
  break
}
```

## Frontend

### Server Actions

**File:** `src/lib/data/customer.ts`

```typescript
// Request reset — always returns success to avoid leaking email existence
export async function requestPasswordReset(formData: FormData)
  -> sdk.auth.resetPassword("customer", "emailpass", { identifier: email })

// Reset password with token
export async function resetPassword(token: string, email: string, password: string)
  -> sdk.auth.updateProvider("customer", "emailpass", { email, password }, token)
```

### Components

| Component | File | Description |
|-----------|------|-------------|
| ForgotPassword | `src/modules/account/components/forgot-password/index.tsx` | Email input form. Shows success message after submission. |
| ResetPasswordForm | `src/modules/account/components/reset-password/index.tsx` | Reads `token` and `email` from URL. Shows invalid/success/form states. |

### Pages

| Page | Route | Description |
|------|-------|-------------|
| Login (forgot link) | `/{countryCode}/account` | "Forgot password?" button switches to ForgotPassword view |
| Reset password | `/{countryCode}/reset-password` | Standalone page (not under `/account` due to parallel route conflict) |

### Translation Keys

All under the `account` namespace in `src/messages/{es,en}.json`:

| Key | ES | EN |
|-----|----|----|
| `forgotPassword` | Olvidaste tu contrasena? | Forgot your password? |
| `forgotPasswordTitle` | Restablecer contrasena | Reset password |
| `forgotPasswordDescription` | Ingresa tu email... | Enter your email... |
| `sendResetLink` | Enviar enlace | Send reset link |
| `resetLinkSent` | Si existe una cuenta... | If an account with that email exists... |
| `backToLogin` | Volver a iniciar sesion | Back to sign in |
| `resetPasswordTitle` | Nueva contrasena | New password |
| `resetPasswordDescription` | Ingresa tu nueva contrasena... | Enter your new password... |
| `resetPassword` | Restablecer contrasena | Reset password |
| `passwordResetSuccess` | Tu contrasena ha sido restablecida... | Your password has been reset... |
| `passwordResetError` | No se pudo restablecer... | Could not reset your password... |
| `invalidResetLink` | El enlace no es valido... | The reset link is invalid... |
| `goToLogin` | Ir a iniciar sesion | Go to sign in |

## Email Template Details

The password-reset email uses the same shared template system as all other emails:

- **Logo:** `EMAIL_LOGO_URL` env var via `emailWrapper()` from `shared.ts`
- **Brand colors:** green `#5B8C3E` + orange `#DA763E` gradient accent line
- **Layout:** Centered 600px card with logo header, content body, and footer with store info
- **CTA button:** Orange background, white text, links to the reset URL
- **Warning box:** Yellow background with "Este enlace expira en 1 hora" message
- **Footer:** Store name, address, phone, email, social links (Instagram, Facebook, WhatsApp)

This matches the style of all other system emails (customer-welcome, order-placed, etc.) and is consistent with the storefront branding.

## Troubleshooting

### Email not sent / not in audit module

The `auth.password_reset` event is emitted by Medusa's `generateResetPasswordTokenWorkflow` via `emitEventStep`, which publishes to the event bus (Redis). This means:

- **`WORKER_MODE=server`**: Events go to Redis but are NOT consumed. No worker is processing them. **The subscriber never runs.**
- **`WORKER_MODE=worker`**: Events are consumed and processed, but no HTTP server runs.
- **`WORKER_MODE=shared`**: Both HTTP + event processing. **Use this for local development.**

**Fix for local development:** Set `WORKER_MODE=shared` in `.env` (or remove the variable entirely — defaults to `shared`).

**Production (Coolify):** Ensure the worker container is running alongside the server container. The worker instance processes events from Redis.

### Token expires too quickly

The reset token expires in **15 minutes** (set by Medusa's workflow, NOT 1 hour as stated in the email template). If users report expired links, they need to request a new one.

### User not found

If the email address doesn't have an `emailpass` auth identity (e.g., the user registered via social login only), the `generateResetPasswordTokenWorkflow` will throw before the event is emitted. No email will be sent. The frontend still returns `{ success: true }` to avoid email enumeration.

## Security Notes

- `requestPasswordReset` always returns `{ success: true }` regardless of whether the email exists, to prevent email enumeration attacks.
- The reset token expires in 15 minutes (Medusa default).
- The reset URL includes both `token` and `email` as query parameters. The email is URI-encoded.
- Password and confirm password must match client-side before submitting.
