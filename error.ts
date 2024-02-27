type AppErrorType =
  | "Authentication"
  | "Data Integrity"
  | "Webhook"
  | "Environment"
  | "WooCommerce Integration"
  | "Request"
  | "Unknown";

export class AppError extends Error {
  public readonly type;
  public readonly statusCode;

  constructor(type: AppErrorType, statusCode: number, message?: string) {
    super(message);

    this.type = type;
    this.statusCode = statusCode;
  }
}
