const stripe = require('../config/stripeConfig');
const { db } = require('../config/firebase');

/**
 * Service for Stripe payment operations
 */
class StripeService {
  /**
   * Create a payment intent
   * @param {Object} paymentData - Payment data
   * @param {string} paymentData.bookingId - Booking ID
   * @param {number} paymentData.amount - Amount to charge (in dollars)
   * @param {string} paymentData.vendorId - Vendor ID
   * @param {string} [paymentData.customerId] - Optional Stripe customer ID
   * @param {string} [paymentData.description] - Optional payment description
   * @returns {Promise<Object>} Payment intent details
   */
  static async createPaymentIntent(paymentData) {
    try {
      const { bookingId, amount, vendorId, customerId, description } = paymentData;
      
      // Calculate application fee (platform fee)
      const applicationFeeAmount = Math.round(amount * 0.05); // 5% platform fee
      
      // Create a payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents for Stripe
        currency: 'usd',
        application_fee_amount: applicationFeeAmount,
        metadata: {
          bookingId,
          vendorId,
          customerId: paymentData.customerId || 'unknown'
        },
        description: description || `Payment for booking #${bookingId}`,
        customer: customerId || undefined,
        automatic_payment_methods: {
          enabled: true,
        },
      });
      
      // Update booking with paymentIntentId
      const bookingRef = db.collection('bookings').doc(bookingId);
      await bookingRef.update({
        stripePaymentIntentId: paymentIntent.id,
        paymentStatus: 'pending'
      });
      
      return {
        id: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        amount: amount,
        status: paymentIntent.status
      };
    } catch (error) {
      console.error('Error creating payment intent:', error);
      throw error;
    }
  }

  /**
   * Process a successful payment
   * @param {Object} paymentIntent - Stripe payment intent
   * @returns {Promise<Object>} Transaction details
   */
  static async processSuccessfulPayment(paymentIntent) {
    try {
      const { bookingId, vendorId } = paymentIntent.metadata;
      
      // Get the booking
      const bookingRef = db.collection('bookings').doc(bookingId);
      const bookingDoc = await bookingRef.get();
      
      if (!bookingDoc.exists) {
        throw new Error('Booking not found');
      }
      
      // Update booking status
      await bookingRef.update({
        paymentStatus: 'paid',
        stripePaymentId: paymentIntent.id
      });
      
      // Create transaction record
      const amount = paymentIntent.amount / 100; // Convert from cents
      const fee = amount * 0.05; // 5% platform fee
      const net = amount - fee;
      
      const transactionData = {
        bookingId,
        vendorId,
        amount,
        fee,
        net,
        stripePaymentId: paymentIntent.id,
        status: 'completed',
        createdAt: new Date().toISOString()
      };
      
      const transactionRef = await db.collection('transactions').add(transactionData);
      
      return {
        id: transactionRef.id,
        ...transactionData
      };
    } catch (error) {
      console.error('Error processing successful payment:', error);
      throw error;
    }
  }

  /**
   * Process a failed payment
   * @param {Object} paymentIntent - Stripe payment intent
   * @returns {Promise<boolean>} Success status
   */
  static async processFailedPayment(paymentIntent) {
    try {
      const { bookingId } = paymentIntent.metadata;
      
      // Get the booking
      const bookingRef = db.collection('bookings').doc(bookingId);
      
      // Update booking status
      await bookingRef.update({
        paymentStatus: 'failed'
      });
      
      return true;
    } catch (error) {
      console.error('Error processing failed payment:', error);
      throw error;
    }
  }

  /**
   * Process a refund
   * @param {Object} refundData - Refund data
   * @param {string} refundData.paymentIntentId - Stripe payment intent ID
   * @param {number} [refundData.amount] - Amount to refund (in dollars)
   * @param {string} [refundData.reason] - Refund reason
   * @returns {Promise<Object>} Refund details
   */
  static async processRefund(refundData) {
    try {
      const { paymentIntentId, amount, reason } = refundData;
      
      // Create the refund in Stripe
      const refundAmount = amount ? Math.round(amount * 100) : undefined; // Convert to cents if provided
      
      const refund = await stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: refundAmount, // If not provided, refund the entire amount
        reason: reason || 'requested_by_customer'
      });
      
      return {
        id: refund.id,
        amount: refundAmount ? refundAmount / 100 : null,
        status: refund.status
      };
    } catch (error) {
      console.error('Error processing refund:', error);
      throw error;
    }
  }

  /**
   * Create a Stripe customer
   * @param {Object} customerData - Customer data
   * @param {string} customerData.email - Customer email
   * @param {string} [customerData.name] - Customer name
   * @param {Object} [customerData.metadata] - Additional metadata
   * @returns {Promise<Object>} Stripe customer
   */
  static async createCustomer(customerData) {
    try {
      const customer = await stripe.customers.create({
        email: customerData.email,
        name: customerData.name,
        metadata: customerData.metadata || {}
      });
      
      return customer;
    } catch (error) {
      console.error('Error creating Stripe customer:', error);
      throw error;
    }
  }

  /**
   * Retrieve a Stripe customer
   * @param {string} customerId - Stripe customer ID
   * @returns {Promise<Object>} Stripe customer
   */
  static async getCustomer(customerId) {
    try {
      const customer = await stripe.customers.retrieve(customerId);
      return customer;
    } catch (error) {
      console.error('Error retrieving Stripe customer:', error);
      throw error;
    }
  }

  /**
   * List payment methods for a customer
   * @param {string} customerId - Stripe customer ID
   * @param {string} [type='card'] - Payment method type
   * @returns {Promise<Array>} Payment methods
   */
  static async listPaymentMethods(customerId, type = 'card') {
    try {
      const paymentMethods = await stripe.paymentMethods.list({
        customer: customerId,
        type
      });
      
      return paymentMethods.data;
    } catch (error) {
      console.error('Error listing payment methods:', error);
      throw error;
    }
  }
}

module.exports = StripeService;
