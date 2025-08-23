import { event as gaEvent } from "nextjs-google-analytics";

export interface ApiResponse {
  data: any;
  status: number;
  headers: Record<string, string>;
  url: string;
}

export interface ApiError {
  message: string;
  type: "CORS" | "NETWORK" | "PARSE" | "VALIDATION" | "TIMEOUT" | "UNKNOWN";
  status?: number;
  originalError?: Error;
}

export interface ApiRequestOptions {
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
}

const DEFAULT_TIMEOUT = 30000; // 30 seconds
const DEFAULT_RETRIES = 1;

export class ApiImportService {
  /**
   * Fetch JSON data from a public API endpoint
   */
  static async fetchJson(url: string, options: ApiRequestOptions = {}): Promise<ApiResponse> {
    const { headers = {}, timeout = DEFAULT_TIMEOUT, retries = DEFAULT_RETRIES } = options;

    // Basic URL validation
    if (!this.isValidUrl(url)) {
      throw this.createError("Invalid URL format", "VALIDATION");
    }

    // Security check - only allow HTTP/HTTPS
    const urlObj = new URL(url);
    if (!["http:", "https:"].includes(urlObj.protocol)) {
      throw this.createError("Only HTTP and HTTPS URLs are allowed", "VALIDATION");
    }

    let lastError: ApiError | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        gaEvent("api_fetch_attempt", { url: urlObj.hostname, attempt });

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          method: "GET",
          headers: {
            Accept: "application/json, text/plain, */*",
            "Content-Type": "application/json",
            ...headers,
          },
          signal: controller.signal,
          mode: "cors", // Enable CORS
          cache: "no-cache",
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw this.createError(
            `HTTP ${response.status}: ${response.statusText}`,
            "NETWORK",
            response.status
          );
        }

        // Get response headers
        const responseHeaders: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          responseHeaders[key] = value;
        });

        // Check content type
        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("application/json") && !contentType.includes("text/")) {
          console.warn("Response may not be JSON, but attempting to parse anyway");
        }

        const text = await response.text();
        let data: any;

        try {
          data = JSON.parse(text);
        } catch (parseError) {
          // If JSON parsing fails, try to extract JSON from text
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              data = JSON.parse(jsonMatch[0]);
            } catch {
              throw this.createError(
                "Response is not valid JSON format",
                "PARSE",
                undefined,
                parseError as Error
              );
            }
          } else {
            throw this.createError(
              "Response is not valid JSON format",
              "PARSE",
              undefined,
              parseError as Error
            );
          }
        }

        gaEvent("api_fetch_success", { url: urlObj.hostname });

        return {
          data,
          status: response.status,
          headers: responseHeaders,
          url: response.url,
        };
      } catch (error) {
        if (error instanceof Error) {
          if (error.name === "AbortError") {
            lastError = this.createError("Request timeout", "TIMEOUT");
          } else if (error.message.includes("CORS")) {
            lastError = this.createError(
              "CORS error - API doesn't allow browser requests",
              "CORS",
              undefined,
              error
            );
          } else if (error.message.includes("Failed to fetch")) {
            lastError = this.createError(
              "Network error - check your internet connection",
              "NETWORK",
              undefined,
              error
            );
          } else if ((error as any)?.type && (error as any)?.message) {
            lastError = error as unknown as ApiError;
          } else {
            lastError = this.createError(
              error.message || "Unknown error occurred",
              "UNKNOWN",
              undefined,
              error
            );
          }
        } else {
          lastError = this.createError("Unknown error occurred", "UNKNOWN");
        }

        // If this is the last attempt, throw the error
        if (attempt === retries) {
          gaEvent("api_fetch_error", {
            url: urlObj.hostname,
            error: lastError.type,
            message: lastError.message,
          });
          throw lastError;
        }

        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }

    // This should never be reached, but just in case
    throw lastError || this.createError("Unknown error occurred", "UNKNOWN");
  }

  /**
   * Validate URL format
   */
  private static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create a standardized API error
   */
  private static createError(
    message: string,
    type: ApiError["type"],
    status?: number,
    originalError?: Error
  ): ApiError {
    return {
      message,
      type,
      status,
      originalError,
    };
  }

  /**
   * Get user-friendly error message with suggestions
   */
  static getErrorMessage(error: ApiError): string {
    switch (error.type) {
      case "CORS":
        return `${error.message}. Try using a CORS proxy or API that supports browser requests.`;
      case "NETWORK":
        return `${error.message}. Please check the URL and your internet connection.`;
      case "PARSE":
        return `${error.message}. The API response is not valid JSON.`;
      case "VALIDATION":
        return `${error.message}. Please check the URL format.`;
      case "TIMEOUT":
        return `${error.message}. The API is taking too long to respond.`;
      default:
        return error.message || "An unexpected error occurred.";
    }
  }

  /**
   * Suggest CORS proxy for problematic URLs
   */
  static suggestCorsProxy(url: string): string {
    return `https://cors-anywhere.herokuapp.com/${url}`;
  }

  /**
   * Check if URL is likely to have CORS issues
   */
  static isLikelyCorsIssue(url: string): boolean {
    try {
      const urlObj = new URL(url);
      // Common APIs that typically support CORS
      const corsAllowedDomains = [
        "jsonplaceholder.typicode.com",
        "httpbin.org",
        "api.github.com",
        "reqres.in",
        "jsonplaceholder.typicode.com",
      ];

      return !corsAllowedDomains.some(domain => urlObj.hostname.includes(domain));
    } catch {
      return true;
    }
  }
}
