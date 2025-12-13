import 'dotenv/config'; // Must be first
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import cors from 'cors';
import generateHandler from './api/generate.js';
import authRoutes from './server/routes/auth.js';
import billingRoutes from './server/routes/billing.js';
import organizationRoutes from './server/routes/organization.js';
import { tenantMiddleware } from './server/middleware/tenant.js';

import helmet from 'helmet';
import { validate } from './server/middleware/validation.js';
import { ScheduleInputSchema } from './server/schemas/scheduleSchema.js';


const app = express();
const PORT = process.env.PORT || 3002;

// Security Headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://static.cloudflareinsights.com",
          "https://cdn.tailwindcss.com",
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
        ],
        imgSrc: [
          "'self'",
          "data:",
          "https://placehold.co",
          "https://dev-szvibc258sbp53d0.us.auth0.com", // Avatar do usuário vem daqui as vezes
        ],
        connectSrc: [
          "'self'",
          "https://cloudflareinsights.com",
          "https://cdn.tailwindcss.com",
          "https://dev-szvibc258sbp53d0.us.auth0.com", // ADICIONADO: Permitir login Auth0
        ],
        frameSrc: [
          "'self'",
          "https://dev-szvibc258sbp53d0.us.auth0.com", // ADICIONADO: Necessário para Auth0 silent auth
        ],
        fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
      },
    },
  })
);

// CORS Configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Webhook route needs raw body for signature verification
// We must define this BEFORE express.json()
app.use('/api/billing/webhook', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '1mb' })); // Limit body size

// Wrapper to adapt Vercel handler to Express
const adapter = (handler: any) => async (req: any, res: any) => {
    const resProxy = {
        status: (code: number) => {
            res.status(code);
            return resProxy;
        },
        json: (data: any) => {
            res.json(data);
            return resProxy;
        },
        setHeader: (name: string, value: string) => {
            res.setHeader(name, value);
            return resProxy;
        },
        end: (data: any) => {
            res.end(data);
            return resProxy;
        }
    };
    await handler(req, resProxy);
};

import { checkJwt, extractTenant } from './server/middleware/auth.js';

app.use('/auth', authRoutes);

// Billing routes (handles its own auth mixed with public webhook)
app.use('/api/billing', billingRoutes);

import { publicInvitationRouter, protectedInvitationRouter } from './server/routes/invitations.js';

// Public routes
app.use('/api/invitations', publicInvitationRouter);

// Protected API Router
const protectedRouter = express.Router();
protectedRouter.use(checkJwt);
protectedRouter.use(extractTenant);

// Organization routes
protectedRouter.use('/organization', organizationRoutes);
protectedRouter.use('/organization', protectedInvitationRouter);

// Protect all API routes with tenant isolation and rate limiting
import { generateSchedule } from './server/controllers/scheduleController.js';
import { exportSchedule } from './server/controllers/exportController.js';

const apiRoutes = express.Router();
apiRoutes.use(tenantMiddleware);
apiRoutes.post('/schedules/generate', validate(ScheduleInputSchema), generateSchedule);
apiRoutes.get('/schedules/:id/export', exportSchedule);
apiRoutes.post('/generate', adapter(generateHandler));

protectedRouter.use(apiRoutes);

app.use('/api', protectedRouter);

// Serve Static Files (Frontend)
// This must be after API routes to ensure API takes precedence
if (process.env.NODE_ENV === 'production' || process.env.VITE_App_ENV === 'production') {
  app.use(express.static(path.join(process.cwd(), 'dist')));

  // Catch-all route for SPA
  app.get(/.*/, (req, res) => {
    res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
  });
}

app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});
