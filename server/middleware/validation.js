// Validate booking data
const validateBookingData = (req, res, next) => {
  const { listingId, startTime, endTime } = req.body;
  
  if (!listingId || !startTime || !endTime) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  // Validate time format
  try {
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    if (start >= end) {
      return res.status(400).json({ error: 'End time must be after start time' });
    }
  } catch (error) {
    return res.status(400).json({ error: 'Invalid date format' });
  }
  
  next();
};

// Validate listing data
const validateListingData = (req, res, next) => {
  const { title, description, price } = req.body;
  
  if (!title || !description || !price) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  // Validate price
  if (isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
    return res.status(400).json({ error: 'Price must be a positive number' });
  }
  
  next();
};

module.exports = {
  validateBookingData,
  validateListingData
};
