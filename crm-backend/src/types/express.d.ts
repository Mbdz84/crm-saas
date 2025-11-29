import "express";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        companyId: string;
        role: string;
      };

      tenantId?: string;

      file?: {
        filename: string;
        path?: string;
        mimetype?: string;
        size?: number;
      };
    }
  }
}