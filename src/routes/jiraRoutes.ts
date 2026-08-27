import { Router } from 'express';
import { jiraController } from '../controllers/JiraController';

const router = Router();

// Jira issue endpoints
router.get('/issue/:issueKey', (req, res) => jiraController.getIssue(req, res));
router.get('/issue/:issueKey/transitions', (req, res) => jiraController.getIssueTransitions(req, res));
router.get('/search', (req, res) => jiraController.searchIssues(req, res));
router.get('/assignable-users', (req, res) => jiraController.getAssignableUsers(req, res));
router.put('/issue/:issueKey/assignee', (req, res) => jiraController.assignIssue(req, res));
router.put('/issue/:issueKey/fix-versions', (req, res) => jiraController.setIssueFixVersions(req, res));
router.put('/issue/:issueKey/labels', (req, res) => jiraController.updateIssueLabels(req, res));
router.get('/projects', (req, res) => jiraController.getProjects(req, res));
router.get('/boards', (req, res) => jiraController.getBoards(req, res));
router.get('/boards/:boardId/sprints', (req, res) => jiraController.getBoardSprints(req, res));
router.get('/boards/:boardId/sprints/suggest', (req, res) => jiraController.suggestBoardSprints(req, res));
router.get('/projects/:projectKeyOrId/versions', (req, res) => jiraController.getProjectVersions(req, res));
router.get('/projects/:projectKeyOrId/versions/suggest', (req, res) => jiraController.suggestProjectVersions(req, res));

// Tech debt ticket endpoints
router.get('/tech-debt/suggest', (req, res) => jiraController.suggestTechDebt(req, res));
router.post('/tech-debt/bulk', (req, res) => jiraController.createTechDebtIssues(req, res));

// Jira sync endpoints
router.post('/sync/:jiraKey', (req, res) => jiraController.syncTaskFromJira(req, res));
router.post('/create', (req, res) => jiraController.createJiraIssue(req, res));
router.post('/transition/:issueKey', (req, res) => jiraController.transitionIssue(req, res));

// Fix version creation endpoints
router.post('/projects/:projectKeyOrId/versions', (req, res) => jiraController.createProjectVersions(req, res));

// Sprint creation endpoints
router.post('/sprints', (req, res) => jiraController.createSprint(req, res));
router.post('/sprints/bulk', (req, res) => jiraController.createSprints(req, res));

export default router;
