const buildFullAddress = (fields) => {
  const parts = [
    fields.houseFlatNumber,
    fields.streetName,
    fields.areaLocality,
    fields.landmark && `Near ${fields.landmark}`,
    fields.buildingName,
    fields.floorNumber && `Floor ${fields.floorNumber}`,
    fields.officeNumber && `Office ${fields.officeNumber}`,
    fields.companyName,
    fields.city,
    fields.state,
    fields.pincode,
    fields.country,
  ].filter(Boolean);
  return parts.join(', ');
};

const nominatimFetch = async (url) => {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'CabBook/1.0 (college-project)' },
  });
  if (!res.ok) throw new Error('Geocoding service unavailable');
  return res.json();
};

const reverseGeocode = async (lat, lng) => {
  const data = await nominatimFetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`
  );
  const addr = data.address || {};
  return {
    fullAddress: data.display_name || '',
    houseFlatNumber: addr.house_number || '',
    streetName: addr.road || addr.pedestrian || '',
    areaLocality: addr.suburb || addr.neighbourhood || addr.quarter || '',
    landmark: addr.amenity || addr.shop || '',
    city: addr.city || addr.town || addr.village || addr.county || '',
    state: addr.state || '',
    country: addr.country || 'India',
    pincode: addr.postcode || '',
    lat: parseFloat(data.lat) || lat,
    lng: parseFloat(data.lon) || lng,
    nearbyLandmarks: (data.namedetails ? Object.values(data.namedetails).slice(0, 5) : []),
  };
};

const searchAddresses = async (query, limit = 8) => {
  if (!query || query.trim().length < 2) return [];
  const data = await nominatimFetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=${limit}&countrycodes=in`
  );
  return (Array.isArray(data) ? data : []).map((item) => {
    const addr = item.address || {};
    return {
      fullAddress: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      houseFlatNumber: addr.house_number || '',
      streetName: addr.road || '',
      areaLocality: addr.suburb || addr.neighbourhood || '',
      city: addr.city || addr.town || addr.village || '',
      state: addr.state || '',
      country: addr.country || 'India',
      pincode: addr.postcode || '',
    };
  });
};

const getDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const estimateDurationMinutes = (distanceKm) => Math.max(5, Math.round((distanceKm / 25) * 60));

module.exports = {
  buildFullAddress,
  reverseGeocode,
  searchAddresses,
  getDistanceKm,
  estimateDurationMinutes,
};
