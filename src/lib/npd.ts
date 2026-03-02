export interface TaxpayerStatusResponse {
  inn: string;
  status: boolean;
  message: string;
  checkedAt: string;
}

/**
 * Validates an INN for an individual (must be 12 digits).
 * @param inn The INN string to validate.
 * @returns True if the INN is valid, false otherwise.
 */
export function isValidInn(inn: string): boolean {
  return /^\d{12}$/.test(inn);
}

/**
 * Checks the self-employed status of a taxpayer by their INN.
 * @param inn The taxpayer's INN.
 * @returns A promise that resolves with the taxpayer's status information.
 */
export async function checkTaxpayerStatus(inn: string): Promise<TaxpayerStatusResponse> {
  try {
    const response = await fetch('/api/check-self-employed', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inn }),
    });

    if (!response.ok) {
      // If the response is not OK, we try to parse the body for an error message.
      // The body might be empty or not valid JSON, so we handle that.
      try {
        const errorData = await response.json();
        throw new Error(errorData.error || `Ошибка сервера: ${response.status}`);
      } catch (e) {
        // This catch block will be executed if response.json() fails (e.g., empty body).
        throw new Error(`Ошибка сети или сервера: ${response.status}`);
      }
    }

    return await response.json();
  } catch (error) {
    throw error; // Re-throw the error to be caught by the component
  }
}