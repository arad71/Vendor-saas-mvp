const express = require('express');
const router = express.Router();
const stripe = require('../config/stripeConfig');
const { db } = require('../config/firebase');
const { validateBookingData } = require('../middleware/validation');
const { verifyAuth } = require('../middleware/auth');

// Create a payment intent (when customer is ready to checkout)
router.post('/create-payment-intent', verifyAuth, async (req, res) => {
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
    
    // Make sure the vendor is the authenticated user
    if (bookingData.vendorId !== req.user.uid) {
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
});

// Webhook to handle Stripe events (payment success, failure, etc.)
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
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
});

// Handle successful payment
async function handleSuccessfulPayment(paymentIntent) {
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
}

// Handle failed payment
async function handleFailedPayment(paymentIntent) {
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
}

module.exports = router;
