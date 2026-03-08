import {
  AbstractAuthModuleProvider,
  MedusaError,
} from "@medusajs/framework/utils"
import type {
  AuthenticationInput,
  AuthenticationResponse,
  AuthIdentityProviderService,
} from "@medusajs/framework/types"
import crypto from "crypto"

type TikTokOptions = {
  clientKey: string
  clientSecret: string
  callbackUrl: string
}

/**
 * TikTok Login Kit OAuth2 provider for Medusa v2.
 *
 * Flow:
 * 1. authenticate() → redirects to TikTok authorization page
 * 2. TikTok redirects to callbackUrl with ?code=...&state=...
 * 3. validateCallback() → exchanges code for access token, fetches user info
 *
 * Docs: https://developers.tiktok.com/doc/login-kit-web
 */
class TikTokAuthProviderService extends AbstractAuthModuleProvider {
  static identifier = "tiktok"
  static DISPLAY_NAME = "TikTok"

  protected options_: TikTokOptions

  constructor(_container: Record<string, unknown>, options: TikTokOptions) {
    // @ts-ignore
    super(...arguments)
    this.options_ = options
  }

  static validateOptions(options: Record<string, any>) {
    if (!options.clientKey) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "TikTok auth requires clientKey"
      )
    }
    if (!options.clientSecret) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "TikTok auth requires clientSecret"
      )
    }
    if (!options.callbackUrl) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "TikTok auth requires callbackUrl"
      )
    }
  }

  async authenticate(
    data: AuthenticationInput,
    authIdentityProviderService: AuthIdentityProviderService
  ): Promise<AuthenticationResponse> {
    const callbackUrl =
      (data.body?.callback_url as string) || this.options_.callbackUrl

    // Generate CSRF state
    const stateKey = crypto.randomBytes(32).toString("hex")
    await authIdentityProviderService.setState(stateKey, {
      callback_url: callbackUrl,
    })

    // TikTok v2 authorization URL
    const params = new URLSearchParams({
      client_key: this.options_.clientKey,
      response_type: "code",
      scope: "user.info.basic",
      redirect_uri: callbackUrl,
      state: stateKey,
    })

    const location = `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`

    return { success: true, location }
  }

  async validateCallback(
    data: AuthenticationInput,
    authIdentityProviderService: AuthIdentityProviderService
  ): Promise<AuthenticationResponse> {
    const code = data.query?.code as string
    const stateKey = data.query?.state as string

    if (!code || !stateKey) {
      return { success: false, error: "Missing code or state parameter" }
    }

    // Validate state
    const state = await authIdentityProviderService.getState(stateKey)
    if (!state) {
      return { success: false, error: "Invalid or expired state" }
    }

    try {
      // Exchange code for access token
      const tokenRes = await fetch(
        "https://open.tiktokapis.com/v2/oauth/token/",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_key: this.options_.clientKey,
            client_secret: this.options_.clientSecret,
            code,
            grant_type: "authorization_code",
            redirect_uri: (state.callback_url as string) || this.options_.callbackUrl,
          }).toString(),
        }
      )

      const tokenData = await tokenRes.json()

      if (tokenData.error || !tokenData.access_token) {
        return {
          success: false,
          error: tokenData.error_description || "Failed to get TikTok token",
        }
      }

      const accessToken = tokenData.access_token
      const openId = tokenData.open_id

      // Fetch user info
      const userRes = await fetch(
        "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      )

      const userData = await userRes.json()
      const userInfo = userData.data?.user || {}

      // Use open_id as entity_id (TikTok doesn't expose email)
      const entityId = `tiktok_${openId}`

      let authIdentity
      try {
        authIdentity = await authIdentityProviderService.retrieve({
          entity_id: entityId,
        })
      } catch {
        // New user — create auth identity
        authIdentity = await authIdentityProviderService.create({
          entity_id: entityId,
          provider_metadata: {
            access_token: accessToken,
            open_id: openId,
          },
          user_metadata: {
            display_name: userInfo.display_name || "",
            avatar_url: userInfo.avatar_url || "",
          },
        })
      }

      return { success: true, authIdentity }
    } catch (error: any) {
      return {
        success: false,
        error: `TikTok authentication failed: ${error.message}`,
      }
    }
  }

  async register(
    data: AuthenticationInput,
    authIdentityProviderService: AuthIdentityProviderService
  ): Promise<AuthenticationResponse> {
    // For OAuth providers, registration happens via authenticate + validateCallback
    return this.authenticate(data, authIdentityProviderService)
  }
}

export default TikTokAuthProviderService
