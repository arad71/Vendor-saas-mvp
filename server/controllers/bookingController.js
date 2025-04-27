const { db } = require('../config/firebase');
const { handleFirestoreError } = require('../utils/errorHandler');

/**
 * Get all bookings for the current vendor
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getVendorBookings = async (req, res) => {
  try {
    const bookingsRef = db.collection('bookings');
    const snapshot = await bookingsRef.where('vendorId', '==', req.user.uid).get();
    
    const bookings = [];
    snapshot.forEach(doc => {
      bookings.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    res.status(200).json(bookings);
  } catch (error) {
    handleFirestoreError(error, res, 'Failed to get bookings');
  }
};

/**
 * Get bookings for the current customer
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getCustomerBookings = async (req, res) => {
  try {
    const bookingsRef = db.collection('bookings');
    const snapshot = await bookingsRef.where('userId', '==', req.user.uid).get();
    
    const bookings = [];
    snapshot.forEach(doc => {
      bookings.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    res.status(200).json(bookings);
  } catch (error) {
    handleFirestoreError(error, res, 'Failed to get bookings');
  }
};

/**
 * Get a single booking by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getBookingById = async (req, res) => {
  try {
    const bookingDoc = await db.collection('bookings').doc(req.params.id).get();
    
    if (!bookingDoc.exists) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    const bookingData = bookingDoc.data();
    
    // Check if user is authorized (either vendor or customer)
    if (bookingData.vendorId !== req.user.uid && bookingData.userId !== req.user.uid) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    res.status(200).json({
      id: bookingDoc.id,
      ...bookingData
    });
  } catch (error) {
    handleFirestoreError(error, res, 'Failed to get booking');
  }
};

/**
 * Create a new booking
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const createBooking = async (req, res) => {
  try {
    const { 
      listingId, 
      startTime, 
      endTime, 
      customerName, 
      customerEmail, 
      customerPhone, 
      notes 
    } = req.body;
    
    // Get the listing to validate and get price
    const listingDoc = await db.collection('listings').doc(listingId).get();
    
    if (!listingDoc.exists) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    
    const listingData = listingDoc.data();
    
    if (listingData.status !== 'active') {
      return res.status(400).json({ error: 'This listing is not currently active' });
    }
    
    // Create the booking
    const newBooking = {
      listingId,
      vendorId: listingData.vendorId,
      userId: req.user.uid,
      customerName: customerName || req.user.name || '',
      customerEmail: customerEmail || req.user.email || '',
      customerPhone: customerPhone || '',
      startTime,
      endTime,
      status: 'pending',
      notes: notes || '',
      totalAmount: listingData.price,
      paymentStatus: 'pending',
      createdAt: new Date().toISOString()
    };
    
    const docRef = await db.collection('bookings').add(newBooking);
    
    res.status(201).json({
      id: docRef.id,
      ...newBooking
    });
  } catch (error) {
    handleFirestoreError(error, res, 'Failed to create booking');
  }
};

/**
 * Update an existing booking
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateBooking = async (req, res) => {
  try {
    const bookingRef = db.collection('bookings').doc(req.params.id);
    const bookingDoc = await bookingRef.get();
    
    if (!bookingDoc.exists) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    const bookingData = bookingDoc.data();
    
    // Check if user is authorized (vendor)
    if (bookingData.vendorId !== req.user.uid) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // Update fields
    const updateData = {};
    const allowedFields = [
      'status', 'startTime', 'endTime', 'notes', 'customerName',
      'customerEmail', 'customerPhone', 'totalAmount'
    ];
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });
    
    updateData.updatedAt = new Date().toISOString();
    
    await bookingRef.update(updateData);
    
    res.status(200).json({
      id: req.params.id,
      ...bookingData,
      ...updateData
    });
  } catch (error) {
    handleFirestoreError(error, res, 'Failed to update booking');
  }
};

/**
 * Cancel a booking (customer action)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const cancelBooking = async (req, res) => {
  try {
    const bookingRef = db.collection('bookings').doc(req.params.id);
    const bookingDoc = await bookingRef.get();
    
    if (!bookingDoc.exists) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    const bookingData = bookingDoc.data();
    
    // Check if user is authorized (customer who made the booking)
    if (bookingData.userId !== req.user.uid) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // Check if the booking is already cancelled
    if (bookingData.status === 'cancelled') {
      return res.status(400).json({ error: 'Booking is already cancelled' });
    }
    
    // Check if the booking is in the past
    const now = new Date();
    const bookingStart = new Date(bookingData.startTime);
    if (bookingStart < now) {
      return res.status(400).json({ error: 'Cannot cancel past bookings' });
    }
    
    // Update status to cancelled
    await bookingRef.update({
      status: 'cancelled',
      updatedAt: new Date().toISOString()
    });
    
    res.status(200).json({
      id: req.params.id,
      ...bookingData,
      status: 'cancelled',
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, res, 'Failed to cancel booking');
  }
};

module.exports = {
  getVendorBookings,
  getCustomerBookings,
  getBookingById,
  createBooking,
  updateBooking,
  cancelBooking
};
