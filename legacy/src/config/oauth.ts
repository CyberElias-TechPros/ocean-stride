// Google Identity Services global types
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          prompt: () => void;
        };
      };
    };
  }
}

// Google OAuth Configuration
// Replace these placeholder values with your actual Google OAuth credentials
export const GOOGLE_OAUTH_CONFIG = {
  clientId: 'YOUR_GOOGLE_CLIENT_ID_HERE', // Replace with your Google OAuth 2.0 Client ID
  redirectUri: window.location.origin, // Use current origin for redirect
  scope: 'openid email profile', // Scopes for authentication and basic profile info
};

// Google Identity Services script URL
export const GOOGLE_GSI_SCRIPT_URL = 'https://accounts.google.com/gsi/client';

// Types for Google OAuth response
export interface GoogleCredentialResponse {
  credential: string; // JWT token containing user info
  select_by: string;
}

export interface GoogleUserInfo {
  sub: string; // Unique Google user ID
  email: string;
  email_verified: boolean;
  name: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  locale?: string;
}