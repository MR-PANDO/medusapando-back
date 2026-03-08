# Social Login

OAuth2 social login with Google, TikTok, and Instagram. Follows Medusa v2 auth module patterns.

## Flow Overview

```
User clicks "Continue with Google"
        |
        v
Frontend: sdk.auth.login("customer", "google", {})
  -> POST /auth/customer/google (backend)
  -> Returns { location: "https://accounts.google.com/..." }
        |
        v
Frontend: window.location.href = location
  -> User authorizes on Google
  -> Google redirects to callbackUrl
        |
        v
GET /api/auth/google/callback?code=...&state=...  (frontend API route)
  -> sdk.auth.callback("customer", "google", searchParams)
  -> Backend exchanges code for token, creates/retrieves auth_identity
  -> Returns JWT
        |
        v
Frontend API route:
  1. Sets _medusa_jwt cookie
  2. Decodes JWT — if actor_id is empty, creates customer via sdk.store.customer.create()
  3. Redirects to /{countryCode}/account
```

## Architecture

### Backend — Auth Providers

All three providers are registered in `medusa-config.ts` under the Auth Module:

```typescript
{
  resolve: "@medusajs/medusa/auth",
  options: {
    providers: [
      { resolve: "@medusajs/medusa/auth-google", id: "google", options: { ... } },
      { resolve: "./src/modules/auth-tiktok",    id: "tiktok", options: { ... } },
      { resolve: "./src/modules/auth-instagram",  id: "instagram", options: { ... } },
    ],
  },
},
```

| Provider | Type | Module Path | Auth API |
|----------|------|-------------|----------|
| Google | Built-in Medusa | `@medusajs/medusa/auth-google` | Google OAuth 2.0 |
| TikTok | Custom | `src/modules/auth-tiktok/` | TikTok Login Kit v2 |
| Instagram | Custom | `src/modules/auth-instagram/` | Facebook Login (Graph API v21.0) |

Each custom provider extends `AbstractAuthModuleProvider` and implements:
- `authenticate()` — generates CSRF state, returns OAuth redirect URL
- `validateCallback()` — exchanges code for access token, fetches user profile, creates/retrieves auth identity
- `register()` — delegates to `authenticate()` (OAuth registration = login)

### Frontend — Components

| File | Description |
|------|-------------|
| `src/modules/account/components/social-login/index.tsx` | Three branded buttons (Google, TikTok, Instagram) with SVG icons |
| `src/app/api/auth/[provider]/callback/route.ts` | API route handles OAuth callback, sets cookie, creates customer |
| `src/modules/account/components/login/index.tsx` | Includes `<SocialLogin />` below the login form |
| `src/modules/account/components/register/index.tsx` | Includes `<SocialLogin />` below the register form |
| `src/modules/account/templates/login-template.tsx` | Displays `auth_error` from URL params after failed OAuth |

## Database — Where Customer Data Lands

When a user logs in with a social provider for the first time, two records are created:

### 1. `auth_identity` table (Medusa core)

Created by the backend auth provider during `validateCallback()`.

| Column | Google | TikTok | Instagram |
|--------|--------|--------|-----------|
| `entity_id` | user's email | `tiktok_{open_id}` | email or `instagram_{facebook_id}` |
| `provider_metadata` | `{ access_token }` | `{ access_token, open_id }` | `{ access_token, facebook_id }` |
| `user_metadata` | _(set by Medusa's Google provider)_ | `{ display_name, avatar_url }` | `{ name, email, picture }` |

### 2. `customer` table (Medusa core)

Created by the frontend callback API route when `actor_id` is empty in the JWT (new user).

| Column | Value |
|--------|-------|
| `email` | User's email from OAuth if available, otherwise `{provider}_{timestamp}@social.placeholder` |
| `first_name` | `""` (empty — user can update later in profile) |
| `last_name` | `""` (empty — user can update later in profile) |

The `customer` record is linked to the `auth_identity` via Medusa's internal `auth_identity.app_metadata.customer_id` field, set automatically when `sdk.store.customer.create()` is called with the auth token.

### Returning users

On subsequent logins, the backend finds the existing `auth_identity` by `entity_id` and returns it. The JWT now contains `actor_id` (the customer ID), so the frontend skips customer creation and goes straight to the account page.

### Querying social customers

To find all customers who signed up via social login:

```sql
-- All TikTok users
SELECT c.* FROM customer c
JOIN auth_identity ai ON ai.app_metadata->>'customer_id' = c.id
WHERE ai.provider_id = 'tiktok';

-- All social users (non-emailpass)
SELECT c.* FROM customer c
JOIN auth_identity ai ON ai.app_metadata->>'customer_id' = c.id
WHERE ai.provider_id IN ('google', 'tiktok', 'instagram');
```

## Environment Variables

### Backend `.env`

```env
# Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=https://nutrimercados.com/api/auth/google/callback

# TikTok OAuth
TIKTOK_CLIENT_KEY=...
TIKTOK_CLIENT_SECRET=...
TIKTOK_CALLBACK_URL=https://nutrimercados.com/api/auth/tiktok/callback

# Instagram (Facebook Login) OAuth
INSTAGRAM_CLIENT_ID=...
INSTAGRAM_CLIENT_SECRET=...
INSTAGRAM_CALLBACK_URL=https://nutrimercados.com/api/auth/instagram/callback
```

### Frontend `.env`

```env
# Used by the callback API route to build redirect URLs
NEXT_PUBLIC_STOREFRONT_URL=https://nutrimercados.com
NEXT_PUBLIC_DEFAULT_REGION=co
```

**Important:** All `*_CALLBACK_URL` values must point to the **frontend** API route (`/api/auth/{provider}/callback`), NOT the backend. The OAuth provider redirects the user's browser to this URL.

---

## How to Get OAuth Credentials

### Google

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project (or select existing)
3. Navigate to **APIs & Services > Credentials**
4. Click **Create Credentials > OAuth client ID**
5. Select **Web application**
6. Set **Authorized JavaScript origins**:
   - `https://nutrimercados.com`
   - `http://localhost:8000` (for development)
7. Set **Authorized redirect URIs**:
   - `https://nutrimercados.com/api/auth/google/callback`
   - `http://localhost:8000/api/auth/google/callback` (for development)
8. Click **Create**
9. Copy **Client ID** → `GOOGLE_CLIENT_ID`
10. Copy **Client Secret** → `GOOGLE_CLIENT_SECRET`

**Also required:**
- Enable the **Google+ API** or **People API** in APIs & Services > Library
- Configure the **OAuth consent screen** (External, add scopes: `email`, `profile`, `openid`)
- Add test users if the app is in "Testing" status

### TikTok

1. Go to [TikTok for Developers](https://developers.tiktok.com/)
2. Log in and go to **Manage apps**
3. Click **Create app** (or select existing)
4. Under **Products**, add **Login Kit**
5. In Login Kit settings:
   - Set **Redirect URI**:
     - `https://nutrimercados.com/api/auth/tiktok/callback`
   - Set **Redirect URI (Staging)**:
     - `http://localhost:8000/api/auth/tiktok/callback`
6. Under **App info**:
   - Copy **Client Key** → `TIKTOK_CLIENT_KEY`
   - Copy **Client Secret** → `TIKTOK_CLIENT_SECRET`
7. Submit the app for review (required for production access)

**Notes:**
- TikTok does NOT expose user email — users are identified by `open_id`
- Scope used: `user.info.basic` (display name + avatar)
- The app must be approved by TikTok before non-test users can log in
- Add test users in the TikTok developer portal while in sandbox mode

### Instagram (via Facebook Login)

Instagram Basic Display API was sunset in December 2024. Instagram login now uses **Facebook Login for Business** with the Facebook Graph API.

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Click **My Apps > Create App**
3. Select **Consumer** or **Business** type
4. Name the app and create it
5. In the app dashboard, add the **Facebook Login** product
6. Go to **Facebook Login > Settings**:
   - Set **Valid OAuth Redirect URIs**:
     - `https://nutrimercados.com/api/auth/instagram/callback`
     - `http://localhost:8000/api/auth/instagram/callback` (for development)
7. Go to **Settings > Basic**:
   - Copy **App ID** → `INSTAGRAM_CLIENT_ID`
   - Copy **App Secret** → `INSTAGRAM_CLIENT_SECRET`
8. Go to **App Review > Permissions and Features**:
   - Request `email` permission (usually auto-approved)
   - Request `public_profile` permission (usually auto-approved)
9. Set the app to **Live** mode when ready for production

**Notes:**
- Despite the variable name `INSTAGRAM_*`, this is a Facebook app — the `clientId` is the Facebook App ID
- Scopes used: `email`, `public_profile`
- If the user grants email permission, their email is used as `entity_id`; otherwise falls back to `instagram_{facebook_id}`
- The user's Facebook profile picture is stored in `user_metadata.picture`

## Translation Keys

All under the `account` namespace in `src/messages/{es,en}.json`:

| Key | ES | EN |
|-----|----|----|
| `orContinueWith` | o continua con | or continue with |
| `continueWithGoogle` | Continuar con Google | Continue with Google |
| `continueWithTikTok` | Continuar con TikTok | Continue with TikTok |
| `continueWithInstagram` | Continuar con Instagram | Continue with Instagram |
| `socialLoginError` | Error al iniciar sesion con {provider}... | Error signing in with {provider}... |
| `socialLoginProcessing` | Procesando inicio de sesion... | Processing sign in... |

## Adding a New Social Provider

1. **Backend:** Create `src/modules/auth-{provider}/` with:
   - `service.ts` — extend `AbstractAuthModuleProvider`, implement `authenticate()`, `validateCallback()`, `register()`
   - `index.ts` — `export default ModuleProvider(Modules.AUTH, { services: [...] })`

2. **Register** in `medusa-config.ts` under the Auth Module's `providers` array

3. **Frontend:** Add the provider to the `PROVIDERS` array in `src/modules/account/components/social-login/index.tsx`:
   ```typescript
   {
     id: "newprovider",
     label: "continueWithNewProvider",  // translation key
     icon: (<svg>...</svg>),
   }
   ```

4. **Translations:** Add `continueWithNewProvider` to both `es.json` and `en.json`

5. **Environment:** Add `NEWPROVIDER_*` env vars to backend `.env` and set `*_CALLBACK_URL` to `https://nutrimercados.com/api/auth/newprovider/callback`

The frontend callback API route (`/api/auth/[provider]/callback`) is generic — it works for any provider without changes.

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| "redirect_uri_mismatch" from Google | Callback URL doesn't match what's registered | Add the exact URL to Google Cloud Console Authorized Redirect URIs |
| User stuck on provider page | `callbackUrl` env var not set or wrong | Check backend `.env`, must point to frontend `/api/auth/{provider}/callback` |
| New user gets error after redirect | Customer creation failed | Check backend logs; `email` may be required — ensure provider returns it or placeholder is used |
| "Invalid or expired state" | CSRF state expired or Redis lost it | Check Redis is running; state is stored via `authIdentityProviderService.setState()` |
| Social button shows error immediately | Backend not reachable or provider not registered | Verify `medusa-config.ts` has the provider, backend is running, and CORS allows frontend origin |
