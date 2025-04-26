import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { createPaymentIntent } from '../../services/stripeService';
import CheckoutForm from '../../components/payments/CheckoutForm';

// Load Stripe outside of component so it's only created once
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY);

const PaymentPage = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [booking, setBooking] = useState(null);
  const [listing, setListing] = useState(null);
  const [clientSecret, setClientSecret] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser || !bookingId) return;
      
      try {
        // Get booking data
        const bookingDoc = await getDoc(doc(db, 'bookings', bookingId));
        
        if (!bookingDoc.exists()) {
          setError('Booking not found');
          setLoading(false);
          return;
        }
        
        const bookingData = bookingDoc.data();
        setBooking(bookingData);
        
        // Check if user is authorized (either vendor or customer)
        if (bookingData.vendorId !== currentUser.uid && bookingData.userId !== currentUser.uid) {
          setError('You are not authorized to view this payment');
          setLoading(false);
          return;
        }
        
        // Get listing data
        const listingDoc = await getDoc(doc(db, 'listings', bookingData.listingId));
        if (listingDoc.exists()) {
          setListing(listingDoc.data());
        }
        
        // If payment already completed, redirect
        if (bookingData.paymentStatus === 'paid') {
          navigate('/payment-success');
          return;
        }
        
        // Create payment intent if not already created
        if (!bookingData.stripePaymentIntentId) {
          const secret = await createPaymentIntent(bookingId, bookingData.totalAmount);
          setClientSecret(secret);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching payment data:', error);
        setError('Failed to load payment information');
        setLoading(false);
      }
    };
    
    fetchData();
  }, [bookingId, currentUser, navigate]);

  const handlePaymentSuccess = () => {
    navigate('/payment-success');
  };

  const handlePaymentError = (error) => {
    console.error('Payment error:', error);
    setError('Payment failed. Please try again.');
  };

  const appearance = {
    theme: 'stripe',
    variables: {
      colorPrimary: '#4f46e5',
    },
  };
  const options = {
    clientSecret,
    appearance,
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-6">Complete Your Payment</h1>
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="spinner"></div>
        </div>
      ) : error ? (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4" role="alert">
          <p>{error}</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {/* Booking Summary */}
          <div className="p-6 border-b">
            <h2 className="text-lg font-medium mb-4">Booking Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Listing</p>
                <p className="font-medium">{listing?.title || 'Unknown Listing'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Date</p>
                <p className="font-medium">
                  {new Date(booking.startTime).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Time</p>
                <p className="font-medium">
                  {new Date(booking.startTime).toLocaleTimeString()} - 
                  {new Date(booking.endTime).toLocaleTimeString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Customer</p>
                <p className="font-medium">{booking.customerName}</p>
              </div>
            </div>
          </div>
          
          {/* Payment Information */}
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-medium">Payment Details</h2>
              <p className="text-2xl font-bold">${parseFloat(booking.totalAmount).toFixed(2)}</p>
            </div>
            
            {clientSecret && (
              <div className="mt-6">
                <Elements options={options} stripe={stripePromise}>
                  <CheckoutForm 
                    clientSecret={clientSecret}
                    bookingId={bookingId}
                    onSuccess={handlePaymentSuccess}
                    onError={handlePaymentError}
                  />
                </Elements>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentPage;
