import { Router } from 'express';
import { jiraController } from '../controllers/JiraController';

const router = Router();

// Jira issue endpoints
router.get('/issue/:issueKey', (req, res) => jiraController.getIssue(req, res));
router.get('/search', (req, res) => jiraController.searchIssues(req, res));
router.get('/projects', (req, res) => jiraController.getProjects(req, res));

// Jira sync endpoints
router.post('/sync/:jiraKey', (req, res) => jiraController.syncTaskFromJira(req, res));
router.post('/create', (req, res) => jiraController.createJiraIssue(req, res));

export default router;
