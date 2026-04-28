import { Router } from 'express';
import { jiraController } from '../controllers/JiraController';

const router = Router();

// Jira issue endpoints
router.get('/issue/:issueKey', (req, res) => jiraController.getIssue(req, res));
router.get('/search', (req, res) => jiraController.searchIssues(req, res));
router.get('/projects', (req, res) => jiraController.getProjects(req, res));
router.get('/boards', (req, res) => jiraController.getBoards(req, res));
router.get('/boards/:boardId/sprints', (req, res) => jiraController.getBoardSprints(req, res));
router.get('/projects/:projectKeyOrId/versions', (req, res) => jiraController.getProjectVersions(req, res));

// Jira sync endpoints
router.post('/sync/:jiraKey', (req, res) => jiraController.syncTaskFromJira(req, res));
router.post('/create', (req, res) => jiraController.createJiraIssue(req, res));

export default router;
