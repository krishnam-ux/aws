import { Resend } from 'resend';

let cachedResendClient: Resend | null = null;

export interface ResendClientStatus {
  resend: Resend | null;
  isConfigured: boolean;
  providerName: string;
}

/**
 * Lazy-initialized singleton Resend client.
 * Server-only execution. Never expose RESEND_API_KEY to the client or in logs.
 */
export function getResendClient(): ResendClientStatus {
  const apiKey = process.env.RESEND_API_KEY;

  if (apiKey && apiKey.trim().length > 0) {
    if (!cachedResendClient) {
      cachedResendClient = new Resend(apiKey.trim());
    }
    return {
      resend: cachedResendClient,
      isConfigured: true,
      providerName: 'RESEND'
    };
  }

  return {
    resend: null,
    isConfigured: false,
    providerName: 'SIMULATED'
  };
}
