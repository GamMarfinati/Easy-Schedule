import 'dotenv/config';
import crypto from 'crypto';
import { auth } from 'express-oauth2-jwt-bearer';
import { Request, Response, NextFunction } from 'express';

// Extend Express Request type to include auth info
declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
    }
  }
}

// Construir issuerBaseURL de forma robusta
const getIssuerBaseURL = (): string => {
  // Priorizar ISSUER_BASE_URL se existir (comum em Railway)
  if (process.env.ISSUER_BASE_URL) {
    return process.env.ISSUER_BASE_URL;
  }
  
  let domain = process.env.AUTH0_DOMAIN || '';
  
  // Remover https:// se o usuário colocou a URL completa
  domain = domain.replace(/^https?:\/\//, '');
  // Remover trailing slash
  domain = domain.replace(/\/$/, '');
  
  return `https://${domain}/`;
};

const issuerURL = getIssuerBaseURL();
const audience = process.env.AUTH0_AUDIENCE;

console.log('[Auth0 Config] Issuer:', issuerURL);
console.log('[Auth0 Config] Audience:', audience);

// Middleware to validate JWT
export const checkJwt = auth({
  audience: audience,
  issuerBaseURL: issuerURL,
  tokenSigningAlg: 'RS256'
});

import db from '../db.js';

// Middleware to extract tenant_id from token
export const extractTenant = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.auth || !req.auth.payload) {
    return next();
  }

  const namespace = 'https://horaprofe.com.br';
  let tenantId = req.auth.payload[`${namespace}/tenant_id`] as string | undefined;

  // Fallback: If tenant_id is not in the token, try to find the user in the DB
  if (!tenantId) {
    try {
      const auth0Id = req.auth.payload.sub;
      const user = await db('users').where({ auth0_id: auth0Id }).first();

      if (user && user.organization_id) {
        tenantId = user.organization_id;
      } else {
        // Auto-create user and organization for dev environment if missing
        console.log("User not found in DB, auto-creating for dev...", auth0Id);
        
        const newOrgId = crypto.randomUUID();
        const newUserId = crypto.randomUUID();
        
        // Create Organization
        await db('organizations').insert({
          id: newOrgId,
          name: 'Minha Escola',
          slug: `school-${Date.now()}`,
          subscription_status: 'free'  // Coluna correta conforme migration
        });

        // Create User
        // Note: Access token might not have email, using placeholder if needed
        const email = req.auth.payload.email as string || `${auth0Id}@placeholder.com`;
        
        await db('users').insert({
          id: newUserId,
          auth0_id: auth0Id,
          organization_id: newOrgId,
          email: email,
          name: 'Admin User',
          role: 'admin'
        });

        tenantId = newOrgId;
        console.log("Auto-created user and org:", newUserId, newOrgId);
      }
    } catch (error) {
      console.error("Error fetching user for tenant fallback:", error);
    }
  }

  if (tenantId) {
    req.tenantId = tenantId;
  }

  next();
};
