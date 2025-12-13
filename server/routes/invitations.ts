import express from 'express';
import db from '../db.js';
import crypto from 'crypto';
import { tenantMiddleware } from '../middleware/tenant.js';
import { emailService } from '../services/email.js';
import { checkJwt } from '../middleware/auth.js';

const router = express.Router();

// Public route to validate token (no auth required initially to see the invite page)
router.get('/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const invite = await db('invitations')
      .join('organizations', 'invitations.organization_id', 'organizations.id')
      .where({ 'invitations.token': token, 'invitations.accepted_at': null })
      .where('invitations.expires_at', '>', new Date())
      .select('invitations.*', 'organizations.name as organization_name')
      .first();

    if (!invite) {
      return res.status(404).json({ error: 'Convite inválido ou expirado.' });
    }

    res.json({
      email: invite.email,
      role: invite.role,
      organization_name: invite.organization_name
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao validar convite.' });
  }
});

// Protected route to accept invite
router.post('/:token/accept', checkJwt, async (req, res) => {
  try {
    const { token } = req.params;
    const userId = req.auth?.payload.sub; // Auth0 ID
    
    // Find user in our DB
    const user = await db('users').where({ auth0_id: userId }).first();
    if (!user) {
        // Should create user if not exists (handled in auth callback usually, but safety check)
        return res.status(400).json({ error: 'Usuário não encontrado.' });
    }

    const invite = await db('invitations')
      .where({ token, accepted_at: null })
      .where('expires_at', '>', new Date())
      .first();

    if (!invite) {
      return res.status(404).json({ error: 'Convite inválido ou expirado.' });
    }

    // Check if already member
    const existingMember = await db('organization_members')
      .where({ organization_id: invite.organization_id, user_id: user.id })
      .first();

    if (existingMember) {
      return res.status(400).json({ error: 'Você já é membro desta organização.' });
    }

    // Add to org
    await db.transaction(async (trx) => {
      await trx('organization_members').insert({
        organization_id: invite.organization_id,
        user_id: user.id,
        role: invite.role
      });

      await trx('invitations')
        .where({ id: invite.id })
        .update({ accepted_at: new Date() });
    });

    res.json({ success: true, organization_id: invite.organization_id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao aceitar convite.' });
  }
});

// Protected routes for managing invites (requires tenant context)
const orgRouter = express.Router();
orgRouter.use(tenantMiddleware);

orgRouter.post('/invite', async (req, res) => {
  try {
    const { email, role } = req.body;
    const tenantId = req.tenantId!;
    const userId = req.auth?.payload.sub; // TODO: map to internal ID

    // Check rate limit (simple count for now)
    const count = await db('invitations')
      .where({ organization_id: tenantId })
      .where('created_at', '>', new Date(Date.now() - 24 * 60 * 60 * 1000))
      .count('id as count')
      .first();

    if (Number(count?.count) > 50) {
      return res.status(429).json({ error: 'Limite de convites diários excedido.' });
    }

    // Create token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    // Get internal user ID (optional, for created_by)
    const user = await db('users').where({ auth0_id: userId }).first();

    await db('invitations').insert({
      email,
      role,
      organization_id: tenantId,
      token,
      expires_at: expiresAt,
      created_by: user?.id
    });

    // Send email
    const inviteLink = `${process.env.FRONTEND_URL}/invite?token=${token}`;
    await emailService.sendInvitationEmail(email, inviteLink);

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao enviar convite.' });
  }
});

orgRouter.get('/invites', async (req, res) => {
  try {
    const invites = await db('invitations')
      .where({ organization_id: req.tenantId, accepted_at: null })
      .select('id', 'email', 'role', 'created_at', 'expires_at');
    res.json(invites);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar convites.' });
  }
});

orgRouter.delete('/invite/:id', async (req, res) => {
  try {
    await db('invitations')
      .where({ id: req.params.id, organization_id: req.tenantId })
      .del();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao revogar convite.' });
  }
});

export { router as publicInvitationRouter, orgRouter as protectedInvitationRouter };
