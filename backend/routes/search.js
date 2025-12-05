// backend/routes/search.js
import express from 'express';
import { unifiedSearch } from '../controllers/searchController.js';

const router = express.Router();

// Unified search endpoint
router.get('/', unifiedSearch);

export default router;

