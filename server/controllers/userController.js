const { admin, db } = require('../config/firebase');
const { handleFirestoreError } = require('../utils/errorHandler');

/**
 * Get current user profile
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getCurrentUser = async (req, res) => {
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
    handleFirestoreError(error, res, 'Failed to get user profile');
  }
};

/**
 * Update current user profile
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateCurrentUser = async (req, res) => {
  try {
    const userRef = db.collection('users').doc(req.user.uid);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Update fields
    const updateData = {};
    const allowedFields = [
      'displayName', 'phone', 'address', 'company', 'companyLogo'
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
    handleFirestoreError(error, res, 'Failed to update user profile');
  }
};

/**
 * Get vendor profile by ID (public data)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getVendorProfile = async (req, res) => {
  try {
    const vendorId = req.params.id;
    const userRef = db.collection('users').doc(vendorId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    
    const userData = userDoc.data();
    
    // Only return public fields
    const publicData = {
      id: vendorId,
      displayName: userData.displayName,
      company: userData.company,
      companyLogo: userData.companyLogo,
    };
    
    res.status(200).json(publicData);
  } catch (error) {
    handleFirestoreError(error, res, 'Failed to get vendor profile');
  }
};

/**
 * Update user password
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updatePassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    
    await admin.auth().updateUser(req.user.uid, {
      password: newPassword
    });
    
    res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ error: 'Failed to update password' });
  }
};

/**
 * Get dashboard metrics for the current vendor
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getDashboardMetrics = async (req, res) => {
  try {
    const vendorId = req.user.uid;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Get listings
    const listingsQuery = await db.collection('listings')
      .where('vendorId', '==', vendorId)
      .get();
    
    const totalListings = listingsQuery.size;
    let activeListings = 0;
    
    listingsQuery.forEach(doc => {
      if (doc.data().status === 'active') {
        activeListings++;
      }
    });
    
    // Get bookings
    const bookingsQuery = await db.collection('bookings')
      .where('vendorId', '==', vendorId)
      .get();
    
    const totalBookings = bookingsQuery.size;
    let pendingBookings = 0;
    let completedBookings = 0;
    
    bookingsQuery.forEach(doc => {
      const data = doc.data();
      if (data.status === 'pending') {
        pendingBookings++;
      } else if (data.status === 'completed') {
        completedBookings++;
      }
    });
    
    // Get transactions
    const transactionsQuery = await db.collection('transactions')
      .where('vendorId', '==', vendorId)
      .get();
    
    let totalRevenue = 0;
    let currentMonthRevenue = 0;
    
    transactionsQuery.forEach(doc => {
      const data = doc.data();
      totalRevenue += data.amount || 0;
      
      const transactionDate = new Date(data.createdAt);
      if (transactionDate >= startOfMonth) {
        currentMonthRevenue += data.amount || 0;
      }
    });
    
    res.status(200).json({
      totalListings,
      activeListings,
      totalBookings,
      pendingBookings,
      completedBookings,
      totalRevenue,
      currentMonthRevenue
    });
  } catch (error) {
    handleFirestoreError(error, res, 'Failed to get dashboard metrics');
  }
};

module.exports = {
  getCurrentUser,
  updateCurrentUser,
  getVendorProfile,
  updatePassword,
  getDashboardMetrics
};
