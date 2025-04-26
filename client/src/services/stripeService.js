import { db } from '../config/firebase';

/**
 * Create a payment intent with Stripe
 * @param {string} bookingId - The ID of the booking
 * @param {number} amount - Payment amount in dollars
 * @returns {Promise<string>} - Client secret for payment intent
 */
export const createPaymentIntent = async (bookingId, amount) => {
  try {
    const response = await fetch('/api/stripe/create-payment-intent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bookingId,
        amount
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create payment intent');
    }
    
    const data = await response.json();
    return data.clientSecret;
  } catch (error) {
    console.error('Error in createPaymentIntent:', error);
    throw error;
  }
};
