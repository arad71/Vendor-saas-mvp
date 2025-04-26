import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
import MetricCard from '../../components/dashboard/MetricCard';
import ActivityItem from '../../components/dashboard/ActivityItem';
import RevenueChart from '../../components/dashboard/RevenueChart';

const Dashboard = () => {
  const { currentUser } = useAuth();
  const [listings, setListings] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [metrics, setMetrics] = useState({
    totalListings: 0,
    activeListings: 0,
    totalBookings: 0,
    pendingBookings: 0,
    totalRevenue: 0,
    currentMonthRevenue: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) return;
      
      try {
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
        
        // Fetch recent activity (combine listings and bookings)
        const activityItems = [
          ...listingsData.map(listing => ({
            id: listing.id,
            type: 'listing',
            title: listing.title,
            status: listing.status,
            timestamp: listing.createdAt,
            data: listing
          })),
          ...bookingsData.map(booking => ({
            id: booking.id,
            type: 'booking',
            title: `Booking #${booking.id.substring(0, 8)}`,
            status: booking.status,
            timestamp: booking.createdAt,
            data: booking
          }))
        ];
        
        // Sort by timestamp (newest first) and limit to 10
        activityItems.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        setRecentActivity(activityItems.slice(0, 10));
        
        // Calculate metrics
        const activeListings = listingsData.filter(listing => listing.status === 'active');
        const pendingBookings = bookingsData.filter(booking => booking.status === 'pending');
        const totalRevenue = bookingsData.reduce((sum, booking) => sum + (booking.totalAmount || 0), 0);
        
        // Calculate current month revenue
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const currentMonthBookings = bookingsData.filter(booking => {
          const bookingDate = new Date(booking.createdAt);
          return bookingDate >= startOfMonth;
        });
        const currentMonthRevenue = currentMonthBookings.reduce((sum, booking) => sum + (booking.totalAmount || 0), 0);
        
        // Update metrics
        setMetrics({
          totalListings: listingsData.length,
          activeListings: activeListings.length,
          totalBookings: bookingsData.length,
          pendingBookings: pendingBookings.length,
          totalRevenue,
          currentMonthRevenue
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [currentUser]);

  // Prepare revenue data for chart
  const prepareRevenueData = () => {
    const last6Months = [];
    const today = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const month = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthName = month.toLocaleString('default', { month: 'short' });
      const year = month.getFullYear();
      
      // Get start and end of this month
      const startOfMonth = new Date(year, month.getMonth(), 1);
      const endOfMonth = new Date(year, month.getMonth() + 1, 0);
      
      // Filter bookings for this month
      const monthBookings = bookings.filter(booking => {
        const bookingDate = new Date(booking.createdAt);
        return bookingDate >= startOfMonth && bookingDate <= endOfMonth;
      });
      
      // Calculate total revenue for this month
      const monthRevenue = monthBookings.reduce((sum, booking) => sum + (booking.totalAmount || 0), 0);
      
      last6Months.push({
        name: `${monthName} ${year}`,
        revenue: monthRevenue
      });
    }
    
    return last6Months;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <Link 
          to="/listings/new" 
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
        >
          + New Listing
        </Link>
      </div>
      
      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <MetricCard 
          title="Total Listings" 
          value={metrics.totalListings} 
          icon="listing"
          color="bg-blue-500"
        />
        <MetricCard 
          title="Active Listings" 
          value={metrics.activeListings} 
          icon="check"
          color="bg-green-500"
        />
        <MetricCard 
          title="Total Bookings" 
          value={metrics.totalBookings} 
          icon="calendar"
          color="bg-purple-500"
        />
        <MetricCard 
          title="Pending Bookings" 
          value={metrics.pendingBookings} 
          icon="clock"
          color="bg-yellow-500"
        />
        <MetricCard 
          title="Total Revenue" 
          value={`$${metrics.totalRevenue.toFixed(2)}`} 
          icon="dollar"
          color="bg-green-600"
        />
        <MetricCard 
          title="Current Month Revenue" 
          value={`$${metrics.currentMonthRevenue.toFixed(2)}`} 
          icon="trending"
          color="bg-indigo-600"
        />
      </div>
      
      {/* Revenue Chart */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Revenue Overview</h2>
        <div className="h-64">
          <RevenueChart data={prepareRevenueData()} />
        </div>
      </div>
      
      {/* Recent Activity */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
        {recentActivity.length === 0 ? (
          <p className="text-gray-500">No recent activity to display</p>
        ) : (
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <ActivityItem key={activity.id} activity={activity} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
