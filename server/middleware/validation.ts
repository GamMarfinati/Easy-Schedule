import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export const validate = (schema: ZodSchema<any>) => async (req: Request, res: Response, next: NextFunction) => {
  try {
    await schema.parseAsync(req.body);
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        error: 'Dados de entrada inválidos',
        details: (error as any).errors.map((e: any) => ({
          path: e.path.join('.'),
          message: e.message
        }))
      });
    }
    return res.status(400).json({ error: 'Erro de validação' });
  }
};
