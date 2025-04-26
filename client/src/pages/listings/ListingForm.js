import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { db, storage } from '../../config/firebase';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  addDoc,
  Timestamp,
  updateDoc
} from 'firebase/firestore';
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';

// Components
import ServiceToggle from '../../components/listings/ServiceToggle';

const ListingForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const isEditMode = !!id;

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('pending');
  const [images, setImages] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [services, setServices] = useState([]);
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [imageFiles, setImageFiles] = useState([]);
  const [documentFiles, setDocumentFiles] = useState([]);
  const [previewImages, setPreviewImages] = useState([]);
  const [previewDocuments, setPreviewDocuments] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch listing data if in edit mode
  useEffect(() => {
    if (isEditMode) {
      const fetchListingData = async () => {
        try {
          setLoading(true);
          const listingDoc = await getDoc(doc(db, 'listings', id));
          
          if (listingDoc.exists()) {
            const data = listingDoc.data();
            setTitle(data.title || '');
            setDescription(data.description || '');
            setPrice(data.price || '');
            setCategory(data.category || '');
            setStatus(data.status || 'pending');
            setImages(data.images || []);
            setDocuments(data.documents || []);
            
            // Fetch associated services
            const servicesCollection = collection(db, 'services');
            const servicesQuery = await getDocs(servicesCollection);
            const servicesData = servicesQuery.docs
              .filter(doc => doc.data().listingId === id)
              .map(doc => ({
                id: doc.id,
                ...doc.data()
              }));
            
            setServices(servicesData);
          } else {
            setError('Listing not found');
            navigate('/listings');
          }
        } catch (error) {
          console.error('Error fetching listing:', error);
          setError('Failed to load listing');
        } finally {
          setLoading(false);
        }
      };
      
      fetchListingData();
    }
  }, [id, isEditMode, navigate]);

  // Handle file uploads
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    setImageFiles(files);
    
    // Create preview URLs
    const previews = files.map(file => URL.createObjectURL(file));
    setPreviewImages(previews);
  };
  
  const handleDocumentChange = (e) => {
    const files = Array.from(e.target.files);
    setDocumentFiles(files);
    
    // Create preview names
    const previews = files.map(file => file.name);
    setPreviewDocuments(previews);
  };

  // Handle service toggles
  const handleAddService = () => {
    setServices([
      ...services,
      {
        id: `temp-${uuidv4()}`,
        name: '',
        description: '',
        price: 0,
        isActive: true,
        isNew: true
      }
    ]);
  };
  
  const handleUpdateService = (index, field, value) => {
    const updatedServices = [...services];
    updatedServices[index][field] = value;
    setServices(updatedServices);
  };
  
  const handleRemoveService = (index) => {
    setServices(services.filter((_, i) => i !== index));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!title || !description || !price) {
      setError('Please fill in all required fields');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      // Prepare listing data
      const listingData = {
        title,
        description,
        price: parseFloat(price),
        category,
        status,
        updatedAt: new Date().toISOString()
      };
      
      if (!isEditMode) {
        listingData.vendorId = currentUser.uid;
        listingData.createdAt = new Date().toISOString();
      }
      
      // Upload images if any
      if (imageFiles.length > 0) {
        const uploadedImageUrls = await Promise.all(
          imageFiles.map(async (file) => {
            const storageRef = ref(storage, `listings/${currentUser.uid}/${uuidv4()}`);
            await uploadBytes(storageRef, file);
            return getDownloadURL(storageRef);
          })
        );
        
        listingData.images = isEditMode ? [...images, ...uploadedImageUrls] : uploadedImageUrls;
      } else if (isEditMode) {
        listingData.images = images;
      }
      
      // Upload documents if any
      if (documentFiles.length > 0) {
        const uploadedDocUrls = await Promise.all(
          documentFiles.map(async (file) => {
            const storageRef = ref(storage, `documents/${currentUser.uid}/${uuidv4()}`);
            await uploadBytes(storageRef, file);
            return getDownloadURL(storageRef);
          })
        );
        
        listingData.documents = isEditMode ? [...documents, ...uploadedDocUrls] : uploadedDocUrls;
      } else if (isEditMode) {
        listingData.documents = documents;
      }
      
      // Save listing
      let listingId = id;
      if (isEditMode) {
        await updateDoc(doc(db, 'listings', id), listingData);
      } else {
        const docRef = await addDoc(collection(db, 'listings'), listingData);
        listingId = docRef.id;
      }
      
      // Save services
      for (const service of services) {
        const serviceData = {
          listingId,
          name: service.name,
          description: service.description,
          price: parseFloat(service.price),
          isActive: service.isActive
        };
        
        if (service.id.startsWith('temp-')) {
          // New service
          await addDoc(collection(db, 'services'), serviceData);
        } else if (!service.isDeleted) {
          // Update existing service
          await updateDoc(doc(db, 'services', service.id), serviceData);
        }
      }
      
      setSuccess('Listing saved successfully');
      
      // Redirect after a short delay
      setTimeout(() => {
        navigate('/listings');
      }, 1500);
      
    } catch (error) {
      console.error('Error saving listing:', error);
      setError('Failed to save listing');
    } finally {
      setLoading(false);
    }
  };

  // Handle image deletion
  const handleDeleteImage = async (index) => {
    try {
      setIsDeleting(true);
      
      // Delete image from storage if in edit mode
      if (isEditMode) {
        const imageUrl = images[index];
        const imageRef = ref(storage, imageUrl);
        await deleteObject(imageRef);
      }
      
      // Update state
      const updatedImages = [...images];
      updatedImages.splice(index, 1);
      setImages(updatedImages);
      
      // Update preview images if in upload state
      if (previewImages.length > 0) {
        const updatedPreviews = [...previewImages];
        updatedPreviews.splice(index, 1);
        setPreviewImages(updatedPreviews);
        
        const updatedFiles = [...imageFiles];
        updatedFiles.splice(index, 1);
        setImageFiles(updatedFiles);
      }
    } catch (error) {
      console.error('Error deleting image:', error);
      setError('Failed to delete image');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle document deletion
  const handleDeleteDocument = async (index) => {
    try {
      setIsDeleting(true);
      
      // Delete document from storage if in edit mode
      if (isEditMode) {
        const docUrl = documents[index];
        const docRef = ref(storage, docUrl);
        await deleteObject(docRef);
      }
      
      // Update state
      const updatedDocs = [...documents];
      updatedDocs.splice(index, 1);
      setDocuments(updatedDocs);
      
      // Update preview documents if in upload state
      if (previewDocuments.length > 0) {
        const updatedPreviews = [...previewDocuments];
        updatedPreviews.splice(index, 1);
        setPreviewDocuments(updatedPreviews);
        
        const updatedFiles = [...documentFiles];
        updatedFiles.splice(index, 1);
        setDocumentFiles(updatedFiles);
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      setError('Failed to delete document');
    } finally {
      setIsDeleting(false);
    }
  };

  // Calculate total price including all active services
  const calculateTotalPrice = () => {
    const basePrice = parseFloat(price) || 0;
    const servicesPrice = services
      .filter(service => service.isActive)
      .reduce((total, service) => total + (parseFloat(service.price) || 0), 0);
    
    return (basePrice + servicesPrice).toFixed(2);
  };

  if (loading && !isDeleting) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">
          {isEditMode ? 'Edit Listing' : 'Create New Listing'}
        </h1>
      </div>
      
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4" role="alert">
          <p>{error}</p>
        </div>
      )}
      
      {success && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4" role="alert">
          <p>{success}</p>
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div className="space-y-4 md:col-span-2">
              <h2 className="text-lg font-medium">Basic Information</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  rows="4"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                ></textarea>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Base Price ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="">Select Category</option>
                    <option value="products">Products</option>
                    <option value="services">Services</option>
                    <option value="rentals">Rentals</option>
                    <option value="events">Events</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="pending">Pending</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>
            
            {/* Images */}
            <div className="space-y-4">
              <h2 className="text-lg font-medium">Images</h2>
              
              <div className="border-2 border-dashed border-gray-300 rounded-md p-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Upload Images (JPG, PNG)
                  </label>
                  <input
                    type="file"
                    multiple
                    accept="image/jpeg, image/png"
                    className="w-full"
                    onChange={handleImageChange}
                  />
                  <p className="text-xs text-gray-500">
                    Upload multiple images. Max 5MB each.
                  </p>
                </div>
              </div>
              
              {/* Preview existing images */}
              {images.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-700">Existing Images</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {images.map((imageUrl, index) => (
                      <div key={index} className="relative">
                        <img
                          src={imageUrl}
                          alt={`Listing ${index + 1}`}
                          className="w-full h-24 object-cover rounded-md"
                        />
                        <button
                          type="button"
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
                          onClick={() => handleDeleteImage(index)}
                          disabled={isDeleting}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Preview new images */}
              {previewImages.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-700">New Images</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {previewImages.map((preview, index) => (
                      <div key={index} className="relative">
                        <img
                          src={preview}
                          alt={`New upload ${index + 1}`}
                          className="w-full h-24 object-cover rounded-md"
                        />
                        <button
                          type="button"
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
                          onClick={() => {
                            const updatedPreviews = [...previewImages];
                            updatedPreviews.splice(index, 1);
                            setPreviewImages(updatedPreviews);
                            
                            const updatedFiles = [...imageFiles];
                            updatedFiles.splice(index, 1);
                            setImageFiles(updatedFiles);
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Documents */}
            <div className="space-y-4">
              <h2 className="text-lg font-medium">Documents</h2>
              
              <div className="border-2 border-dashed border-gray-300 rounded-md p-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Upload Documents (PDF, DOC)
                  </label>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx"
                    className="w-full"
                    onChange={handleDocumentChange}
                  />
                  <p className="text-xs text-gray-500">
                    Upload additional documentation. Max 10MB each.
                  </p>
                </div>
              </div>
              
              {/* Preview existing documents */}
              {documents.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-700">Existing Documents</h3>
                  <div className="space-y-2">
                    {documents.map((docUrl, index) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-gray-100 rounded">
                        <a 
                          href={docUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:text-indigo-800"
                        >
                          Document {index + 1}
                        </a>
                        <button
                          type="button"
                          className="text-red-500 hover:text-red-700"
                          onClick={() => handleDeleteDocument(index)}
                          disabled={isDeleting}
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Preview new documents */}
              {previewDocuments.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-700">New Documents</h3>
                  <div className="space-y-2">
                    {previewDocuments.map((name, index) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-gray-100 rounded">
                        <span className="truncate">{name}</span>
                        <button
                          type="button"
                          className="text-red-500 hover:text-red-700"
                          onClick={() => {
                            const updatedPreviews = [...previewDocuments];
                            updatedPreviews.splice(index, 1);
                            setPreviewDocuments(updatedPreviews);
                            
                            const updatedFiles = [...documentFiles];
                            updatedFiles.splice(index, 1);
                            setDocumentFiles(updatedFiles);
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Additional Services */}
            <div className="space-y-4 md:col-span-2">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-medium">Additional Services</h2>
                <button
                  type="button"
                  className="text-indigo-600 hover:text-indigo-800"
                  onClick={handleAddService}
                >
                  + Add Service
                </button>
              </div>
              
              {services.length === 0 ? (
                <p className="text-gray-500">No additional services added yet. Click "Add Service" to create one.</p>
              ) : (
                <div className="space-y-4">
                  {services.map((service, index) => (
                    <ServiceToggle
                      key={service.id}
                      service={service}
                      onUpdate={(field, value) => handleUpdateService(index, field, value)}
                      onRemove={() => handleRemoveService(index)}
                    />
                  ))}
                </div>
              )}
            </div>
            
            {/* Price Preview */}
            <div className="md:col-span-2 bg-indigo-50 p-4 rounded-md">
              <h2 className="text-lg font-medium mb-2">Pricing Preview</h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Base Price:</span>
                  <span>${parseFloat(price || 0).toFixed(2)}</span>
                </div>
                
                {services.filter(s => s.isActive).map((service, index) => (
                  <div key={index} className="flex justify-between">
                    <span>{service.name || `Service ${index + 1}`}:</span>
                    <span>${parseFloat(service.price || 0).toFixed(2)}</span>
                  </div>
                ))}
                
                <div className="border-t pt-2 flex justify-between font-bold">
                  <span>Total Price:</span>
                  <span>${calculateTotalPrice()}</span>
                </div>
              </div>
            </div>
            
            {/* Form Actions */}
            <div className="md:col-span-2 flex justify-end space-x-4">
              <button
                type="button"
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                onClick={() => navigate('/listings')}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                disabled={loading}
              >
                {loading ? 'Saving...' : isEditMode ? 'Update Listing' : 'Create Listing'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ListingForm;
