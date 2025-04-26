import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../config/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  getDoc,
  doc,
  addDoc,
  updateDoc,
  Timestamp 
} from 'firebase/firestore';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import BookingModal from '../../components/calendar/BookingModal';
import BookingDetailModal from '../../components/calendar/BookingDetailModal';

const Calendar = () => {
  const { currentUser } = useAuth();
  const calendarRef = useRef(null);
  const [bookings, setBookings] = useState([]);
  const [listings, setListings] = useState([]);
  const [selectedListing, setSelectedListing] = useState('all');
  const [selectedDate, setSelectedDate] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch listings and bookings
  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) return;
      
      try {
        setLoading(true);
        
        // Fetch listings
        const listingsQuery = query(
          collection(db, 'listings'),
          where('vendorId', '==', currentUser.uid)
        );
        const listingsSnapshot = await getDocs(listingsQuery);
        const listingsData = listingsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setListings(listingsData);
        
        // Fetch bookings
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
      } catch (error) {
        console.error('Error fetching calendar data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [currentUser]);

  // Transform bookings for FullCalendar
  const transformBookingsToEvents = () => {
    return bookings
      .filter(booking => 
        selectedListing === 'all' || booking.listingId === selectedListing
      )
      .map(booking => {
        // Find associated listing
        const listing = listings.find(l => l.id === booking.listingId);
        
        // Set color based on booking status
        let backgroundColor;
        switch(booking.status) {
          case 'confirmed':
            backgroundColor = '#4f46e5'; // indigo
            break;
          case 'pending':
            backgroundColor = '#eab308'; // yellow
            break;
          case 'cancelled':
            backgroundColor = '#ef4444'; // red
            break;
          default:
            backgroundColor = '#6b7280'; // gray
        }
        
        return {
          id: booking.id,
          title: listing ? listing.title : `Booking #${booking.id.substring(0, 8)}`,
          start: booking.startTime,
          end: booking.endTime,
          backgroundColor,
          borderColor: backgroundColor,
          extendedProps: {
            booking,
            listing
          }
        };
      });
  };

  // Handle date selection (for creating a new booking)
  const handleDateSelect = (selectInfo) => {
    setSelectedDate({
      start: selectInfo.startStr,
      end: selectInfo.endStr
    });
    setShowBookingModal(true);
  };

  // Handle event click (for viewing booking details)
  const handleEventClick = (clickInfo) => {
    setSelectedBook
