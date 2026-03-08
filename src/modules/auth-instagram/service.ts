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

type InstagramOptions = {
  clientId: string
  clientSecret: string
  callbackUrl: string
}

/**
 * Instagram OAuth2 provider for Medusa v2 (via Facebook Login).
 *
 * Uses Facebook's Graph API with `instagram_basic` scope.
 * Instagram Basic Display API was sunset Dec 2024 — this uses
 * Facebook Login which returns both Facebook and Instagram profile.
 *
 * Flow:
 * 1. authenticate() → redirects to Facebook authorization page with instagram_basic scope
 * 2. Facebook redirects to callbackUrl with ?code=...&state=...
 * 3. validateCallback() → exchanges code for access token, fetches user info
 *
 * Docs: https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login
 */
class InstagramAuthProviderService extends AbstractAuthModuleProvider {
  static identifier = "instagram"
  static DISPLAY_NAME = "Instagram"

  protected options_: InstagramOptions

  constructor(_container: Record<string, unknown>, options: InstagramOptions) {
    // @ts-ignore
    super(...arguments)
    this.options_ = options
  }

  static validateOptions(options: Record<string, any>) {
    if (!options.clientId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Instagram auth requires clientId (Facebook App ID)"
      )
    }
    if (!options.clientSecret) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Instagram auth requires clientSecret (Facebook App Secret)"
      )
    }
    if (!options.callbackUrl) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Instagram auth requires callbackUrl"
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

    // Facebook OAuth URL with email + instagram_basic scopes
    const params = new URLSearchParams({
      client_id: this.options_.clientId,
      redirect_uri: callbackUrl,
      scope: "email,public_profile",
      response_type: "code",
      state: stateKey,
    })

    const location = `https://www.facebook.com/v21.0/dialog/oauth?${params.toString()}`

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
      // Exchange code for access token via Facebook Graph API
      const tokenParams = new URLSearchParams({
        client_id: this.options_.clientId,
        client_secret: this.options_.clientSecret,
        redirect_uri: (state.callback_url as string) || this.options_.callbackUrl,
        code,
      })

      const tokenRes = await fetch(
        `https://graph.facebook.com/v21.0/oauth/access_token?${tokenParams.toString()}`
      )

      const tokenData = await tokenRes.json()

      if (tokenData.error || !tokenData.access_token) {
        return {
          success: false,
          error:
            tokenData.error?.message || "Failed to get Instagram/Facebook token",
        }
      }

      const accessToken = tokenData.access_token

      // Fetch user profile from Facebook Graph API
      const userRes = await fetch(
        `https://graph.facebook.com/v21.0/me?fields=id,name,email,picture&access_token=${accessToken}`
      )

      const userInfo = await userRes.json()

      if (userInfo.error) {
        return {
          success: false,
          error: userInfo.error.message || "Failed to get user info",
        }
      }

      // Use email if available, otherwise Facebook ID
      const entityId = userInfo.email || `instagram_${userInfo.id}`

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
            facebook_id: userInfo.id,
          },
          user_metadata: {
            name: userInfo.name || "",
            email: userInfo.email || "",
            picture: userInfo.picture?.data?.url || "",
          },
        })
      }

      return { success: true, authIdentity }
    } catch (error: any) {
      return {
        success: false,
        error: `Instagram authentication failed: ${error.message}`,
      }
    }
  }

  async register(
    data: AuthenticationInput,
    authIdentityProviderService: AuthIdentityProviderService
  ): Promise<AuthenticationResponse> {
    return this.authenticate(data, authIdentityProviderService)
  }
}

export default InstagramAuthProviderService
