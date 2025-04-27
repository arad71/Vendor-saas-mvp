const { db } = require('../config/firebase');
const FirebaseService = require('./firebaseService');

/**
 * Service for booking operations
 */
class BookingService {
  /**
   * Create a new booking
   * @param {Object} bookingData - Booking data
   * @returns {Promise<Object>} Created booking
   */
  static async createBooking(bookingData) {
    try {
      // Check if the listing exists
      const listing = await FirebaseService.getDocument('listings', bookingData.listingId);
      
      if (!listing) {
        throw new Error('Listing not found');
      }
      
      // Check if the listing is active
      if (listing.status !== 'active') {
        throw new Error('Listing is not active');
      }
      
      // Check if the requested time slot is available
      const isAvailable = await BookingService.checkAvailability(
        bookingData.listingId,
        bookingData.startTime,
        bookingData.endTime
      );
      
      if (!isAvailable) {
        throw new Error('The requested time slot is not available');
      }
      
      // Create the booking
      const newBooking = {
        ...bookingData,
        vendorId: listing.vendorId,
        totalAmount: bookingData.totalAmount || listing.price,
        status: bookingData.status || 'pending',
        paymentStatus: 'pending',
        createdAt: new Date().toISOString()
      };
      
      // Create in database
      const createdBooking = await FirebaseService.createDocument('bookings', newBooking);
      
      return createdBooking;
    } catch (error) {
      console.error('Error creating booking:', error);
      throw error;
    }
  }

  /**
   * Check if a time slot is available
   * @param {string} listingId - Listing ID
   * @param {string} startTime - Start time (ISO string)
   * @param {string} endTime - End time (ISO string)
   * @returns {Promise<boolean>} Availability status
   */
  static async checkAvailability(listingId, startTime, endTime) {
    try {
      const start = new Date(startTime);
      const end = new Date(endTime);
      
      // Validate times
      if (start >= end) {
        throw new Error('End time must be after start time');
      }
      
      // Check for overlapping bookings
      const bookings = await FirebaseService.queryDocuments('bookings', [
        ['listingId', '==', listingId],
        ['status', 'in', ['pending', 'confirmed']]
      ]);
      
      // Check each booking for overlap
      for (const booking of bookings) {
        const bookingStart = new Date(booking.startTime);
        const bookingEnd = new Date(booking.endTime);
        
        // Check for overlap
        if (
          (start >= bookingStart && start < bookingEnd) || // Start time is within existing booking
          (end > bookingStart && end <= bookingEnd) || // End time is within existing booking
          (start <= bookingStart && end >= bookingEnd) // New booking completely encompasses existing booking
        ) {
          return false; // Overlap found, not available
        }
      }
      
      return true; // No overlaps, time slot is available
    } catch (error) {
      console.error('Error checking availability:', error);
      throw error;
    }
  }

  /**
   * Update a booking
   * @param {string} bookingId - Booking ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated booking
   */
  static async updateBooking(bookingId, updateData) {
    try {
      // Get the current booking
      const booking = await FirebaseService.getDocument('bookings', bookingId);
      
      if (!booking) {
        throw new Error('Booking not found');
      }
      
      // If updating times, check availability
      if (updateData.startTime || updateData.endTime) {
        const startTime = updateData.startTime || booking.startTime;
        const endTime = updateData.endTime || booking.endTime;
        
        // Check if the new time slot is available (excluding this booking)
        const overlappingBookings = await FirebaseService.queryDocuments('bookings', [
          ['listingId', '==', booking.listingId],
          ['status', 'in', ['pending', 'confirmed']],
          ['id', '!=', bookingId]
        ]);
        
        const start = new Date(startTime);
        const end = new Date(endTime);
        
        // Validate times
        if (start >= end) {
          throw new Error('End time must be after start time');
        }
        
        // Check each booking for overlap
        for (const existingBooking of overlappingBookings) {
          const bookingStart = new Date(existingBooking.startTime);
          const bookingEnd = new Date(existingBooking.endTime);
          
          // Check for overlap
          if (
            (start >= bookingStart && start < bookingEnd) ||
            (end > bookingStart && end <= bookingEnd) ||
            (start <= bookingStart && end >= bookingEnd)
          ) {
            throw new Error('The requested time slot is not available');
          }
        }
      }
      
      // Add updated timestamp
      updateData.updatedAt = new Date().toISOString();
      
      // Update the booking
      await FirebaseService.updateDocument('bookings', bookingId, updateData);
      
      // Get and return the updated booking
      return await FirebaseService.getDocument('bookings', bookingId);
    } catch (error) {
      console.error('Error updating booking:', error);
      throw error;
    }
  }

  /**
   * Cancel a booking
   * @param {string} bookingId - Booking ID
   * @param {string} userId - User ID (for authorization)
   * @param {string} cancelReason - Reason for cancellation
   * @returns {Promise<Object>} Cancelled booking
   */
  static async cancelBooking(bookingId, userId, cancelReason = '') {
    try {
      // Get the booking
      const booking = await FirebaseService.getDocument('bookings', bookingId);
      
      if (!booking) {
        throw new Error('Booking not found');
      }
      
      // Check authorization (must be vendor or the customer who made the booking)
      if (booking.vendorId !== userId && booking.userId !== userId) {
        throw new Error('Unauthorized to cancel this booking');
      }
      
      // Check if the booking is already cancelled
      if (booking.status === 'cancelled') {
        throw new Error('Booking is already cancelled');
      }
      
      // Check if the booking is in the past
      const now = new Date();
      const bookingStart = new Date(booking.startTime);
      
      if (bookingStart < now) {
        throw new Error('Cannot cancel past bookings');
      }
      
      // Update the booking status
      const updateData = {
        status: 'cancelled',
        cancelReason: cancelReason,
        cancelledBy: userId,
        cancelledAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await FirebaseService.updateDocument('bookings', bookingId, updateData);
      
      // Get and return the updated booking
      return await FirebaseService.getDocument('bookings', bookingId);
    } catch (error) {
      console.error('Error cancelling booking:', error);
      throw error;
    }
  }

  /**
   * Get upcoming bookings for a vendor
   * @param {string} vendorId - Vendor ID
   * @param {number} [limit=10] - Maximum number of bookings to retrieve
   * @returns {Promise<Array>} Upcoming bookings
   */
  static async getUpcomingBookings(vendorId, limit = 10) {
    try {
      const now = new Date().toISOString();
      
      // Query bookings that haven't started yet and aren't cancelled
      const bookings = await FirebaseService.queryDocuments('bookings', [
        ['vendorId', '==', vendorId],
        ['startTime', '>=', now],
        ['status', '!=', 'cancelled']
      ], {
        orderByField: 'startTime',
        orderByDirection: 'asc',
        limit
      });
      
      return bookings;
    } catch (error) {
      console.error('Error getting upcoming bookings:', error);
      throw error;
    }
  }

  /**
   * Get bookings for a specific date range
   * @param {string} vendorId - Vendor ID
   * @param {string} startDate - Start date (ISO string)
   * @param {string} endDate - End date (ISO string)
   * @returns {Promise<Array>} Bookings in date range
   */
  static async getBookingsInDateRange(vendorId, startDate, endDate) {
    try {
      // Query bookings within the date range
      const bookings = await FirebaseService.queryDocuments('bookings', [
        ['vendorId', '==', vendorId],
        ['startTime', '>=', startDate],
        ['endTime', '<=', endDate]
      ], {
        orderByField: 'startTime',
        orderByDirection: 'asc'
      });
      
      return bookings;
    } catch (error) {
      console.error('Error getting bookings in date range:', error);
      throw error;
    }
  }

  /**
   * Get booking metrics for a vendor
   * @param {string} vendorId - Vendor ID
   * @returns {Promise<Object>} Booking metrics
   */
  static async getBookingMetrics(vendorId) {
    try {
      const now = new Date().toISOString();
      
      // Get all bookings for this vendor
      const bookings = await FirebaseService.queryDocuments('bookings', [
        ['vendorId', '==', vendorId]
      ]);
      
      // Calculate metrics
      let totalBookings = bookings.length;
      let pendingBookings = 0;
      let confirmedBookings = 0;
      let cancelledBookings = 0;
      let upcomingBookings = 0;
      let pastBookings = 0;
      let totalRevenue = 0;
      
      bookings.forEach(booking => {
        // Count by status
        if (booking.status === 'pending') {
          pendingBookings++;
        } else if (booking.status === 'confirmed') {
          confirmedBookings++;
        } else if (booking.status === 'cancelled') {
          cancelledBookings++;
        }
        
        // Count upcoming vs past
        if (new Date(booking.startTime) > new Date(now)) {
          upcomingBookings++;
        } else {
          pastBookings++;
        }
        
        // Calculate revenue (only count paid bookings)
        if (booking.paymentStatus === 'paid') {
          totalRevenue += booking.totalAmount || 0;
        }
      });
      
      return {
        totalBookings,
        pendingBookings,
        confirmedBookings,
        cancelledBookings,
        upcomingBookings,
        pastBookings,
        totalRevenue
      };
    } catch (error) {
      console.error('Error getting booking metrics:', error);
      throw error;
    }
  }
}

module.exports = BookingService;
