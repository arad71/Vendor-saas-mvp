import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../config/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc,
  updateDoc
} from 'firebase/firestore';

// Components
import ListingCard from '../../components/listings/ListingCard';

const ListingsPage = () => {
  const { currentUser } = useAuth();
  const [listings, setListings] = useState([]);
  const [filteredListings, setFilteredListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchListings = async () => {
      if (!currentUser) return;
      
      try {
        const q = query(
          collection(db, 'listings'),
          where('vendorId', '==', currentUser.uid)
        );
        
        const querySnapshot = await getDocs(q);
        const listingsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setListings(listingsData);
        setFilteredListings(listingsData);
      } catch (error) {
        console.error('Error fetching listings:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchListings();
  }, [currentUser]);

  // Apply filters when statusFilter or searchTerm changes
  useEffect(() => {
    let filtered = [...listings];
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(listing => listing.status === statusFilter);
    }
    
    // Apply search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(listing => 
        listing.title.toLowerCase().includes(term) || 
        listing.description.toLowerCase().includes(term)
      );
    }
    
    setFilteredListings(filtered);
  }, [statusFilter, searchTerm, listings]);

  const handleStatusChange = async (listingId, newStatus) => {
    try {
      const listingRef = doc(db, 'listings', listingId);
      await updateDoc(listingRef, {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
      
      // Update local state
      setListings(prevListings => 
        prevListings.map(listing => 
          listing.id === listingId 
            ? { ...listing, status: newStatus, updatedAt: new Date().toISOString() } 
            : listing
        )
      );
    } catch (error) {
      console.error('Error updating listing status:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">My Listings</h1>
        <Link 
          to="/listings/new" 
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
        >
          + New Listing
        </Link>
      </div>
      
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search listings..."
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div>
          <select
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>
      
      {/* Listings */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="spinner"></div>
        </div>
      ) : filteredListings.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow text-center">
          <p className="text-gray-500 mb-4">No listings found</p>
          <Link 
            to="/listings/new"
            className="text-indigo-600 hover:text-indigo-800"
          >
            Create your first listing
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredListings.map(listing => (
            <ListingCard 
              key={listing.id} 
              listing={listing} 
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ListingsPage;
