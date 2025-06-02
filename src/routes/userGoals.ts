import express, { Router, Request, Response } from 'express';
import { db } from '../db';
import { userGoal as userGoalSchema } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { authenticationMiddleware } from '../../auth';

const router: Router = express.Router();

// Route to create a new goal for the authenticated user
router.post('/', authenticationMiddleware, async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    // This case should ideally be handled by the middleware, but as a safeguard:
    res.status(401).json({ message: 'User not authenticated' });
    return;
  }

  const { goalText } = req.body;

  if (!goalText || typeof goalText !== 'string' || goalText.trim() === '') {
    res.status(400).json({ message: 'Goal text is required and cannot be empty.' });
    return;
  }

  try {
    const newGoal = await db
      .insert(userGoalSchema)
      .values({
        userId: userId,
        goalText: goalText.trim(),
      })
      .returning();

    res.status(201).json({ message: 'Goal created successfully', goal: newGoal[0] });
  } catch (error) {
    console.error('Error creating user goal:', error);
    res.status(500).json({ message: 'Failed to create goal' });
  }
});

// Route to get all goals for the authenticated user
router.get('/', authenticationMiddleware, async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: 'User not authenticated' });
    return;
  }

  try {
    const goals = await db
      .select()
      .from(userGoalSchema)
      .where(eq(userGoalSchema.userId, userId));
      // Optionally, order by creation date or other criteria
      // .orderBy(desc(userGoalSchema.createdAt)); 

    res.status(200).json(goals); // Backend was returning {goals: goalsData} but frontend expects array directly for goals
  } catch (error) {
    console.error('Error fetching user goals:', error);
    res.status(500).json({ message: 'Failed to fetch goals' });
  }
});

// Route to update a specific goal for the authenticated user
router.put('/:goalId', authenticationMiddleware, async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const goalId = parseInt(req.params.goalId, 10);

  if (!userId) {
    res.status(401).json({ message: 'User not authenticated' });
    return;
  }
  if (isNaN(goalId)) {
    res.status(400).json({ message: 'Invalid goal ID.' });
    return;
  }

  const { goalText, isAchieved } = req.body;
  const updateData: Partial<{ goalText: string; isAchieved: boolean }> = {};

  if (goalText !== undefined) {
    if (typeof goalText !== 'string' || goalText.trim() === '') {
        res.status(400).json({ message: 'Goal text cannot be empty.' });
        return;
    }
    updateData.goalText = goalText.trim();
  }
  if (isAchieved !== undefined) {
    if (typeof isAchieved !== 'boolean') {
        res.status(400).json({ message: 'isAchieved must be a boolean.' });
        return;
    }
    updateData.isAchieved = isAchieved;
  }

  if (Object.keys(updateData).length === 0) {
    res.status(400).json({ message: 'No update data provided.' });
    return;
  }

  try {
    const updatedGoal = await db
      .update(userGoalSchema)
      .set(updateData)
      .where(and(eq(userGoalSchema.id, goalId), eq(userGoalSchema.userId, userId)))
      .returning();

    if (updatedGoal.length === 0) {
      res.status(404).json({ message: 'Goal not found or user not authorized to update.' });
      return;
    }

    res.status(200).json({ message: 'Goal updated successfully', goal: updatedGoal[0] });
  } catch (error) {
    console.error('Error updating user goal:', error);
    res.status(500).json({ message: 'Failed to update goal' });
  }
});

// Route to delete a specific goal for the authenticated user
router.delete('/:goalId', authenticationMiddleware, async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const goalId = parseInt(req.params.goalId, 10);

  if (!userId) {
    res.status(401).json({ message: 'User not authenticated' });
    return;
  }
  if (isNaN(goalId)) {
    res.status(400).json({ message: 'Invalid goal ID.' });
    return;
  }

  try {
    const deletedGoal = await db
      .delete(userGoalSchema)
      .where(and(eq(userGoalSchema.id, goalId), eq(userGoalSchema.userId, userId)))
      .returning();

    if (deletedGoal.length === 0) {
      res.status(404).json({ message: 'Goal not found or user not authorized to delete.' });
      return;
    }

    res.status(200).json({ message: 'Goal deleted successfully', goal: deletedGoal[0] });
  } catch (error) {
    console.error('Error deleting user goal:', error);
    res.status(500).json({ message: 'Failed to delete goal' });
  }
});

export default router;
