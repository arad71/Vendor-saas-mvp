const express = require('express');
const router = express.Router();
const { admin, db } = require('../config/firebase');
const { verifyAuth } = require('../middleware/auth');

// Get current user profile
router.get('/me', verifyAuth, async (req, res) => {
  try {
    const userRef = db.collection('users').doc(req.user.uid);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.status(200).json({
      id: userDoc.id,
      ...userDoc.data()
    });
  } catch (error) {
    console.error('Error getting user profile:', error);
    res.status(500).json({ error: 'Failed to get user profile' });
  }
});

// Update user profile
router.put('/me', verifyAuth, async (req, res) => {
  try {
    const userRef = db.collection('users').doc(req.user.uid);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Update fields
    const updateData = {};
    const allowedFields = [
      'displayName', 'phone', 'address', 'company'
    ];
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });
    
    updateData.updatedAt = new Date().toISOString();
    
    await userRef.update(updateData);
    
    // If display name is updated, also update in Auth
    if (updateData.displayName) {
      await admin.auth().updateUser(req.user.uid, {
        displayName: updateData.displayName
      });
    }
    
    res.status(200).json({
      id: req.user.uid,
      ...userDoc.data(),
      ...updateData
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ error: 'Failed to update user profile' });
  }
});

module.exports = router;
