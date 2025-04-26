const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const { verifyAuth } = require('../middleware/auth');
const { validateBookingData } = require('../middleware/validation');

// Get all bookings for current vendor
router.get('/', verifyAuth, async (req, res) => {
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
    console.error('Error getting bookings:', error);
    res.status(500).json({ error: 'Failed to get bookings' });
  }
});

// Get a single booking
router.get('/:id', verifyAuth, async (req, res) => {
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
    console.error('Error getting booking:', error);
    res.status(500).json({ error: 'Failed to get booking' });
  }
});

// Create a new booking
router.post('/', verifyAuth, validateBookingData, async (req, res) => {
  try {
    const { listingId, startTime, endTime, customerName, customerEmail, customerPhone, notes } = req.body;
    
    // Get the listing to validate and get price
    const listingDoc = await db.collection('listings').doc(listingId).get();
    
    if (!listingDoc.exists) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    
    const listingData = listingDoc.data();
    
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
    console.error('Error creating booking:', error);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

// Update a booking
router.put('/:id', verifyAuth, async (req, res) => {
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
      'customerEmail', 'customerPhone'
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
    console.error('Error updating booking:', error);
    res.status(500).json({ error: 'Failed to update booking' });
  }
});

module.exports = router;
