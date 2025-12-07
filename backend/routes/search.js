// backend/routes/search.js
import express from 'express';
import { unifiedSearch, searchTransport } from '../controllers/searchController.js';

const router = express.Router();

// Unified search endpoint
router.get('/', unifiedSearch);

// Transport search endpoint (buses, trains, flights)
router.get('/transport', searchTransport);

export default router;

