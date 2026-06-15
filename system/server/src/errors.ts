import type { StockConflictLine } from "@anf/shared";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public payload?: Record<string, unknown>,
  ) {
    super(message);
  }
}

export class NotFoundError extends HttpError {
  constructor(message = "Not found") {
    super(404, message);
  }
}

export class StockConflictError extends HttpError {
  constructor(public lines: StockConflictLine[]) {
    super(409, "Some items don't have enough stock.", { lines });
  }
}
