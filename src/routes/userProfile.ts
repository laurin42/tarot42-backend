import express, { Router, Request, Response } from 'express';
import { db } from '../db';
import { user as userSchema } from '../db/schema';
import { eq } from 'drizzle-orm';
import { authenticationMiddleware } from '../../auth';

const router: Router = express.Router();

// Route to update user profile data
router.put('/', authenticationMiddleware, async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: 'User not authenticated' });
    return;
  }

  const { 
    // Astrologische Daten
    zodiacSign, 
    element, // Maps to selectedElement in DB
    
    // Persönliche Ziele & Details
    personalGoals,
    additionalDetails,
    focusArea,
    
    // Demografische Daten
    gender,
    ageRange,
    
    // Geburtstag & Zeit
    birthDateTime,
    includeTime,
    
    // Legacy fields (backward compatibility)
    birthday,
    selectedElement
  } = req.body;

  try {
    const updateData: Partial<{
      zodiacSign: string;
      selectedElement: string;
      personalGoals: string;
      additionalDetails: string;
      focusArea: string;
      gender: string;
      ageRange: string;
      birthDateTime: string;
      includeTime: boolean;
      birthday: Date;
      updatedAt: Date;
    }> = {};

    // Astrologische Daten
    if (zodiacSign && typeof zodiacSign === 'string') {
      updateData.zodiacSign = zodiacSign.trim();
    }
    if (element && typeof element === 'string') {
      updateData.selectedElement = element.trim();
    }
    // Backward compatibility
    if (selectedElement && typeof selectedElement === 'string') {
      updateData.selectedElement = selectedElement.trim();
    }

    // Persönliche Ziele & Details
    if (personalGoals && typeof personalGoals === 'string') {
      updateData.personalGoals = personalGoals.trim();
    }
    if (additionalDetails && typeof additionalDetails === 'string') {
      updateData.additionalDetails = additionalDetails.trim();
    }
    if (focusArea && typeof focusArea === 'string') {
      updateData.focusArea = focusArea.trim();
    }

    // Demografische Daten
    if (gender && typeof gender === 'string') {
      updateData.gender = gender.trim();
    }
    if (ageRange && typeof ageRange === 'string') {
      updateData.ageRange = ageRange.trim();
    }

    // Geburtstag & Zeit
    if (birthDateTime && typeof birthDateTime === 'string') {
      updateData.birthDateTime = birthDateTime.trim();
    }
    if (typeof includeTime === 'boolean') {
      updateData.includeTime = includeTime;
    }

    // Legacy birthday handling
    if (birthday && typeof birthday === 'string') {
      const date = new Date(birthday);
      if (isNaN(date.getTime())) {
        res.status(400).json({ message: 'Invalid birthday format.' });
        return;
      }
      updateData.birthday = date;
    }

    // Always update the updatedAt timestamp
    updateData.updatedAt = new Date();

    if (Object.keys(updateData).length <= 1) { // Only updatedAt
      res.status(400).json({ message: 'No update data provided.' });
      return;
    }

    console.log('[UserProfile] Updating user profile:', { userId, updateData });

    const updatedUser = await db
      .update(userSchema)
      .set(updateData)
      .where(eq(userSchema.id, userId))
      .returning();

    if (updatedUser.length === 0) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.status(200).json({ 
      message: 'Profile updated successfully', 
      user: updatedUser[0] 
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

// Route to get user profile data
router.get('/', authenticationMiddleware, async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: 'User not authenticated' });
    return;
  }

  try {
    const currentUser = await db
      .select({
        id: userSchema.id,
        name: userSchema.name,
        email: userSchema.email,
        image: userSchema.image,
        
        // Astrologische Daten
        zodiacSign: userSchema.zodiacSign,
        selectedElement: userSchema.selectedElement,
        
        // Persönliche Ziele & Details
        personalGoals: userSchema.personalGoals,
        additionalDetails: userSchema.additionalDetails,
        focusArea: userSchema.focusArea,
        
        // Demografische Daten
        gender: userSchema.gender,
        ageRange: userSchema.ageRange,
        
        // Geburtstag & Zeit
        birthDateTime: userSchema.birthDateTime,
        includeTime: userSchema.includeTime,
        
        // Legacy fields (backward compatibility)
        birthday: userSchema.birthday,
        age: userSchema.age,
        
        // Timestamps
        createdAt: userSchema.createdAt,
        updatedAt: userSchema.updatedAt,
      })
      .from(userSchema)
      .where(eq(userSchema.id, userId))
      .limit(1);

    if (currentUser.length === 0) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const user = currentUser[0];
    
    // Add computed fields for backward compatibility
    const responseUser = {
      ...user,
      // Map selectedElement to element for frontend compatibility
      element: user.selectedElement,
    };

    console.log('[UserProfile] Fetched user profile:', { userId, hasData: !!user });

    res.status(200).json(responseUser);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Failed to fetch profile' });
  }
});

// Route to get profile completeness
router.get('/completeness', authenticationMiddleware, async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: 'User not authenticated' });
    return;
  }

  try {
    const currentUser = await db
      .select({
        zodiacSign: userSchema.zodiacSign,
        selectedElement: userSchema.selectedElement,
        personalGoals: userSchema.personalGoals,
        focusArea: userSchema.focusArea,
        gender: userSchema.gender,
        ageRange: userSchema.ageRange,
        birthDateTime: userSchema.birthDateTime,
      })
      .from(userSchema)
      .where(eq(userSchema.id, userId))
      .limit(1);

    if (currentUser.length === 0) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const user = currentUser[0];
    const fields = [
      user.zodiacSign,
      user.selectedElement,
      user.personalGoals,
      user.focusArea,
      user.gender,
      user.ageRange,
      user.birthDateTime,
    ];
    
    const filledFields = fields.filter(field => field && field.toString().trim() !== '').length;
    const completeness = Math.round((filledFields / fields.length) * 100);

    res.status(200).json({ 
      completeness,
      totalFields: fields.length,
      filledFields,
      missingFields: fields.length - filledFields
    });
  } catch (error) {
    console.error('Error calculating profile completeness:', error);
    res.status(500).json({ message: 'Failed to calculate completeness' });
  }
});

export default router;