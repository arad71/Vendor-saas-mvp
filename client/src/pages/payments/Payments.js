import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../config/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit,
  Timestamp 
} from 'firebase/firestore';

// Components
import TransactionTable from '../../components/payments/TransactionTable';
import PaymentChart from '../../components/payments/PaymentChart';

const Payments = () => {
  const { currentUser } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [dateRange, setDateRange] = useState('month'); // 'week', 'month', 'year'
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({
    revenue: 0,
    pending: 0,
    completed: 0,
    fees: 0
  });

  // Fetch transactions and bookings
  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) return;
      
      try {
        setLoading(true);
        
        // Fetch transactions
        const transactionsQuery = query(
          collection(db, 'transactions'),
          where('vendorId', '==', currentUser.uid),
          orderBy('createdAt', 'desc')
        );
        const transactionsSnapshot = await getDocs(transactionsQuery);
        const transactionsData = transactionsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setTransactions(transactionsData);
        
        // Fetch bookings to get customer information
        const bookingsQuery = query(
          collection(db, 'bookings'),
          where('vendorId', '==', currentUser.uid)
        );
        const bookingsSnapshot = await getDocs(bookingsQuery);
        const bookingsData = bookingsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setBookings(bookingsData);
        
        // Calculate totals
        const revenue = transactionsData.reduce((sum, transaction) => sum + (transaction.amount || 0), 0);
        const fees = transactionsData.reduce((sum, transaction) => sum + (transaction.fee || 0), 0);
        const completed = transactionsData
          .filter(t => t.status === 'completed')
          .reduce((sum, transaction) => sum + (transaction.amount || 0), 0);
        const pending = transactionsData
          .filter(t => t.status === 'pending')
          .reduce((sum, transaction) => sum + (transaction.amount || 0), 0);
        
        setTotals({
          revenue,
          completed,
          pending,
          fees
        });
      } catch (error) {
        console.error('Error fetching payment data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [currentUser]);

  // Filter transactions based on date range
  const getFilteredTransactions = () => {
    if (transactions.length === 0) return [];
    
    const now = new Date();
