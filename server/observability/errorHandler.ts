import { Request, Response, NextFunction } from 'express';
import logger from './logger';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

const STATUS_MESSAGES: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  422: 'Unprocessable Entity',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
};

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  const requestId = req.requestId || 'unknown';

  if (err instanceof AppError) {
    logger.warn(
      { requestId, statusCode: err.statusCode, path: req.path, method: req.method },
      err.message,
    );
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
      requestId,
    });
  }

  const statusCode = (err as any).statusCode || (err as any).status || 500;

  if (statusCode >= 500) {
    logger.error(
      { requestId, err, path: req.path, method: req.method },
      'Unhandled server error',
    );
  } else {
    logger.warn(
      { requestId, statusCode, path: req.path, method: req.method },
      err.message,
    );
  }

  const safeMessage =
    statusCode >= 500
      ? STATUS_MESSAGES[500]
      : err.message || STATUS_MESSAGES[statusCode] || 'Error';

  return res.status(statusCode).json({
    success: false,
    error: safeMessage,
    requestId,
  });
}

export function notFoundHandler(req: Request, res: Response) {
  const requestId = req.requestId || 'unknown';
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.path}`,
    requestId,
  });
}
