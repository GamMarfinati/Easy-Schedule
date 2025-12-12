import express from 'express';
import db from '../db';
import { tenantMiddleware } from '../middleware/tenant';

const router = express.Router();

router.use(tenantMiddleware);

// Get current organization details
router.get('/', async (req, res) => {
  try {
    const org = await db('organizations').where({ id: req.tenantId }).first();
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    res.json(org);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch organization' });
  }
});

// Update organization details
router.put('/', async (req, res) => {
  try {
    const { name, timezone } = req.body;
    await db('organizations')
      .where({ id: req.tenantId })
      .update({
        name,
        timezone,
        updated_at: new Date()
      });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update organization' });
  }
});

// List organization members
router.get('/users', async (req, res) => {
  try {
    const users = await db('organization_members')
      .join('users', 'organization_members.user_id', 'users.id')
      .where('organization_members.organization_id', req.tenantId)
      .select(
        'users.id',
        'users.name',
        'users.email',
        'organization_members.role',
        'organization_members.created_at as joined_at'
      );
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

export default router;
