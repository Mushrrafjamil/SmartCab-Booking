const Driver = require('../models/Driver.model');

const findNearestDrivers = async (latitude, longitude, vehicleType, maxDistanceKm = 5) => {
  const query = {
    isOnline: true,
    isApproved: true,
    status: 'approved',
    currentLocation: {
      $near: {
        $geometry: { type: 'Point', coordinates: [longitude, latitude] },
        $maxDistance: maxDistanceKm * 1000,
      },
    },
  };

  const drivers = await Driver.find(query)
    .populate('user', 'fullName phone profilePhoto')
    .populate('vehicle')
    .limit(10);

  if (vehicleType) {
    return drivers.filter((d) => d.vehicle?.vehicleType === vehicleType);
  }
  return drivers;
};

module.exports = { findNearestDrivers };
