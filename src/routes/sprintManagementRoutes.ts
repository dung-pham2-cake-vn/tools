import { Router } from 'express';
import {
  getConfluenceChildren,
  getLoadedPages,
  loadPage,
  getPageContent,
  analyzePages,
  getResults,
  getCachedTickets,
  reloadCachedTickets,
} from '../controllers/SprintManagementController';

const router = Router();

router.get('/confluence-children', getConfluenceChildren);
router.get('/loaded-pages', getLoadedPages);
router.post('/load-page/:pageId', loadPage);
router.get('/page-content/:pageId', getPageContent);
router.post('/analyze', analyzePages);
router.get('/results', getResults);
router.get('/tickets', getCachedTickets);
router.post('/tickets/reload', reloadCachedTickets);

export default router;
