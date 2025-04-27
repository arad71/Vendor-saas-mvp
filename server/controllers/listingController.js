const { db } = require('../config/firebase');
const { handleFirestoreError } = require('../utils/errorHandler');

/**
 * Get all listings for current vendor
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getVendorListings = async (req, res) => {
  try {
    const listingsRef = db.collection('listings');
    const snapshot = await listingsRef.where('vendorId', '==', req.user.uid).get();
    
    const listings = [];
    snapshot.forEach(doc => {
      listings.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    res.status(200).json(listings);
  } catch (error) {
    handleFirestoreError(error, res, 'Failed to get listings');
  }
};

/**
 * Get a single listing by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getListingById = async (req, res) => {
  try {
    const listingDoc = await db.collection('listings').doc(req.params.id).get();
    
    if (!listingDoc.exists) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    
    res.status(200).json({
      id: listingDoc.id,
      ...listingDoc.data()
    });
  } catch (error) {
    handleFirestoreError(error, res, 'Failed to get listing');
  }
};

/**
 * Create a new listing
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const createListing = async (req, res) => {
  try {
    const { title, description, price, category, status, images, documents } = req.body;
    
    const newListing = {
      title,
      description,
      price: parseFloat(price),
      category: category || '',
      status: status || 'pending',
      images: images || [],
      documents: documents || [],
      vendorId: req.user.uid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const docRef = await db.collection('listings').add(newListing);
    
    res.status(201).json({
      id: docRef.id,
      ...newListing
    });
  } catch (error) {
    handleFirestoreError(error, res, 'Failed to create listing');
  }
};

/**
 * Update an existing listing
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateListing = async (req, res) => {
  try {
    const listingRef = db.collection('listings').doc(req.params.id);
    const listingDoc = await listingRef.get();
    
    if (!listingDoc.exists) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    
    const listingData = listingDoc.data();
    
    // Check if user is authorized (vendor)
    if (listingData.vendorId !== req.user.uid) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // Update fields
    const updateData = {};
    const allowedFields = [
      'title', 'description', 'price', 'category', 
      'status', 'images', 'documents'
    ];
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'price') {
          updateData[field] = parseFloat(req.body[field]);
        } else {
          updateData[field] = req.body[field];
        }
      }
    });
    
    updateData.updatedAt = new Date().toISOString();
    
    await listingRef.update(updateData);
    
    res.status(200).json({
      id: req.params.id,
      ...listingData,
      ...updateData
    });
  } catch (error) {
    handleFirestoreError(error, res, 'Failed to update listing');
  }
};

/**
 * Delete a listing
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const deleteListing = async (req, res) => {
  try {
    const listingRef = db.collection('listings').doc(req.params.id);
    const listingDoc = await listingRef.get();
    
    if (!listingDoc.exists) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    
    const listingData = listingDoc.data();
    
    // Check if user is authorized (vendor)
    if (listingData.vendorId !== req.user.uid) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // Check if there are any active bookings
    const bookingsRef = db.collection('bookings');
    const snapshot = await bookingsRef
      .where('listingId', '==', req.params.id)
      .where('status', '!=', 'cancelled')
      .get();
    
    if (!snapshot.empty) {
      return res.status(400).json({ 
        error: 'Cannot delete listing with active bookings' 
      });
    }
    
    // Delete the listing
    await listingRef.delete();
    
    res.status(200).json({ message: 'Listing deleted successfully' });
  } catch (error) {
    handleFirestoreError(error, res, 'Failed to delete listing');
  }
};

module.exports = {
  getVendorListings,
  getListingById,
  createListing,
  updateListing,
  deleteListing
};
