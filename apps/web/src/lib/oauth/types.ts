export interface OAuthClient {
  id: string;
  clientName: string | null;
  redirectUris: string[];
  grantTypes: string[];
  tokenEndpointAuthMethod: string;
  createdAt: string;
}

export interface OAuthAccessTokenClaims {
  sub: string; // user_id
  business_id: string;
  business_slug: string;
  scopes: string; // comma-separated, same convention as workspace_api_tokens.scopes
  client_id: string;
  jti: string;
}
