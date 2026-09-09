import express from 'express';
import { updateProfile, getAllUsers, deleteUser } from '../controllers/userController.js';
import { verifyJWT } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/roleCheck.js';

const router = express.Router();

router.use(verifyJWT);

router.put('/profile', updateProfile);
router.get('/', authorizeRoles('Admin'), getAllUsers);
router.delete('/:id', authorizeRoles('Admin'), deleteUser);

export default router;
