const stripe = require('../config/stripeConfig');
const { db } = require('../config/firebase');
const { handleFirestoreError } = require('../utils/errorHandler');

/**
 * Create a payment intent with Stripe
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const createPaymentIntent = async (req, res) => {
  try {
    const { bookingId, amount, customerId } = req.body;
    
    if (!bookingId || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Get the booking from Firestore
    const bookingRef = db.collection('bookings').doc(bookingId);
    const bookingDoc = await bookingRef.get();
    
    if (!bookingDoc.exists) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    const bookingData = bookingDoc.data();
    
    // Make sure the vendor is the authenticated user or the customer is the authenticated user
    if (bookingData.vendorId !== req.user.uid && bookingData.userId !== req.user.uid) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // Calculate application fee (platform fee)
    const applicationFeeAmount = Math.round(amount * 0.05); // 5% platform fee
    
    // Create a payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents for Stripe
      currency: 'usd',
      application_fee_amount: applicationFeeAmount,
      metadata: {
        bookingId,
        vendorId: bookingData.vendorId,
        customerId: bookingData.userId
      },
      // If you have a Stripe Customer ID already, use it
      customer: customerId || undefined,
      // This enables automatic payment methods for the customer
      automatic_payment_methods: {
        enabled: true,
      },
    });
    
    // Update booking with paymentIntentId
    await bookingRef.update({
      stripePaymentIntentId: paymentIntent.id,
      paymentStatus: 'pending'
    });
    
    res.status(200).json({
      clientSecret: paymentIntent.client_secret
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ error: 'Failed to create payment' });
  }
};

/**
 * Get all transactions for the current vendor
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getTransactions = async (req, res) => {
  try {
    const transactionsRef = db.collection('transactions');
    const snapshot = await transactionsRef
      .where('vendorId', '==', req.user.uid)
      .orderBy('createdAt', 'desc')
      .get();
    
    const transactions = [];
    snapshot.forEach(doc => {
      transactions.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    res.status(200).json(transactions);
  } catch (error) {
    handleFirestoreError(error, res, 'Failed to get transactions');
  }
};

/**
 * Handle webhook events from Stripe
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  let event;
  
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      await handleSuccessfulPayment(paymentIntent);
      break;
    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object;
      await handleFailedPayment(failedPayment);
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }
  
  // Return a 200 response to acknowledge receipt of the event
  res.status(200).send();
};

/**
 * Internal helper to handle successful payments
 * @param {Object} paymentIntent - Stripe payment intent object
 */
const handleSuccessfulPayment = async (paymentIntent) => {
  try {
    const { bookingId, vendorId } = paymentIntent.metadata;
    
    // Get the booking
    const bookingRef = db.collection('bookings').doc(bookingId);
    const bookingDoc = await bookingRef.get();
    
    if (!bookingDoc.exists) {
      throw new Error('Booking not found');
    }
    
    const bookingData = bookingDoc.data();
    
    // Update booking status
    await bookingRef.update({
      paymentStatus: 'paid',
      stripePaymentId: paymentIntent.id
    });
    
    // Create transaction record
    const amount = paymentIntent.amount / 100; // Convert from cents
    const fee = amount * 0.05; // 5% platform fee
    const net = amount - fee;
    
    await db.collection('transactions').add({
      bookingId,
      vendorId,
      amount,
      fee,
      net,
      stripePaymentId: paymentIntent.id,
      status: 'completed',
      createdAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error handling successful payment:', error);
  }
};

/**
 * Internal helper to handle failed payments
 * @param {Object} paymentIntent - Stripe payment intent object
 */
const handleFailedPayment = async (paymentIntent) => {
  try {
    const { bookingId } = paymentIntent.metadata;
    
    // Get the booking
    const bookingRef = db.collection('bookings').doc(bookingId);
    
    // Update booking status
    await bookingRef.update({
      paymentStatus: 'failed'
    });
    
  } catch (error) {
    console.error('Error handling failed payment:', error);
  }
};

/**
 * Refund a payment
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const refundPayment = async (req, res) => {
  try {
    const { bookingId, amount, reason } = req.body;
    
    if (!bookingId) {
      return res.status(400).json({ error: 'Booking ID is required' });
    }
    
    // Get the booking
    const bookingRef = db.collection('bookings').doc(bookingId);
    const bookingDoc = await bookingRef.get();
    
    if (!bookingDoc.exists) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    const bookingData = bookingDoc.data();
    
    // Check if user is authorized (vendor)
    if (bookingData.vendorId !== req.user.uid) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // Check if the booking has a payment
    if (!bookingData.stripePaymentId) {
      return res.status(400).json({ error: 'No payment found for this booking' });
    }
    
    // Check if the payment status is paid
    if (bookingData.paymentStatus !== 'paid') {
      return res.status(400).json({ error: 'Cannot refund a booking that is not paid' });
    }
    
    // Create the refund in Stripe
    const refundAmount = amount ? Math.round(amount * 100) : undefined; // Convert to cents if provided
    
    const refund = await stripe.refunds.create({
      payment_intent: bookingData.stripePaymentId,
      amount: refundAmount, // If not provided, refund the entire amount
      reason: reason || 'requested_by_customer'
    });
    
    // Update booking status
    await bookingRef.update({
      paymentStatus: refundAmount ? 'partially_refunded' : 'refunded',
      refundId: refund.id,
      updatedAt: new Date().toISOString()
    });
    
    // Create transaction record for the refund
    const refundAmountValue = refundAmount ? refundAmount / 100 : booking
