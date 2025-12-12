import express from 'express';
import { checkJwt } from '../middleware/auth';

const router = express.Router();

// Endpoint to handle post-login logic (e.g. create user in DB)
// Protected by checkJwt to ensure only authenticated users can call it
router.post('/callback', checkJwt, async (req, res) => {
  try {
    const user = req.auth?.payload;
    // TODO: Check if user exists in DB, if not create them
    // TODO: Return user details or tenant info
    
    console.log("User authenticated:", user?.sub);
    
    res.status(200).json({ message: 'User authenticated', user });
  } catch (error) {
    console.error("Error in auth callback:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/logout', (req, res) => {
  // Server-side logout logic if needed (e.g. invalidating tokens if using a blacklist)
  // For JWTs, client-side deletion is usually enough, but we might want to log it
  res.status(200).json({ message: 'Logged out successfully' });
});

export default router;
