const Address = require('../models/Address');
const LocationHistory = require('../models/LocationHistory');
const Notification = require('../models/Notification');
const { logActivity } = require('../services/authService');
const {
  buildFullAddress,
  reverseGeocode,
  searchAddresses,
  getDistanceKm,
  estimateDurationMinutes,
} = require('../services/geocodingService');

const formatAddress = (doc) => {
  const a = doc.toObject ? doc.toObject() : doc;
  return {
    ...a,
    id: a._id,
    label: a.type === 'custom' ? (a.customLabel || a.displayLabel || 'Custom') : a.type,
  };
};

const validateCoords = (lat, lng) =>
  typeof lat === 'number' && typeof lng === 'number' && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;

const buildAddressPayload = (body) => {
  const fullAddress = body.fullAddress?.trim() || buildFullAddress(body);
  if (!fullAddress) throw new Error('Address is required');
  const lat = parseFloat(body.lat);
  const lng = parseFloat(body.lng);
  if (!validateCoords(lat, lng)) throw new Error('Valid GPS coordinates are required');
  return {
    type: body.type,
    customLabel: body.customLabel?.trim(),
    displayLabel: body.displayLabel?.trim(),
    houseFlatNumber: body.houseFlatNumber?.trim(),
    streetName: body.streetName?.trim(),
    areaLocality: body.areaLocality?.trim(),
    landmark: body.landmark?.trim(),
    city: body.city?.trim(),
    state: body.state?.trim(),
    country: body.country?.trim() || 'India',
    pincode: body.pincode?.trim(),
    companyName: body.companyName?.trim(),
    buildingName: body.buildingName?.trim(),
    floorNumber: body.floorNumber?.trim(),
    officeNumber: body.officeNumber?.trim(),
    fullAddress,
    lat,
    lng,
    accuracy: body.accuracy ? parseFloat(body.accuracy) : undefined,
    isFavorite: body.isFavorite === true,
    isVerified: body.isVerified === true,
  };
};

const checkDuplicate = async (userId, payload, excludeId) => {
  const query = {
    userId,
    isDeleted: false,
    lat: { $gte: payload.lat - 0.0001, $lte: payload.lat + 0.0001 },
    lng: { $gte: payload.lng - 0.0001, $lte: payload.lng + 0.0001 },
  };
  if (excludeId) query._id = { $ne: excludeId };
  return Address.findOne(query);
};

const notifyAddressUpdate = async (userId, title, message) => {
  await Notification.create({ userId, title, message, type: 'address', read: false });
};

exports.listAddresses = async (req, res, next) => {
  try {
    const { type, favorites, recent, limit = 50 } = req.query;
    const query = { userId: req.user._id, isDeleted: false };
    if (type) query.type = type;
    if (favorites === 'true') query.isFavorite = true;

    let q = Address.find(query);
    if (recent === 'true') q = q.sort({ lastUsedAt: -1, useCount: -1 });
    else q = q.sort({ isDefault: -1, isFavorite: -1, updatedAt: -1 });

    const addresses = await q.limit(Number(limit));
    res.json({ success: true, addresses: addresses.map(formatAddress) });
  } catch (error) {
    next(error);
  }
};

exports.getRecommendations = async (req, res, next) => {
  try {
    const [favorites, recent, defaults] = await Promise.all([
      Address.find({ userId: req.user._id, isDeleted: false, isFavorite: true }).limit(5),
      Address.find({ userId: req.user._id, isDeleted: false }).sort({ lastUsedAt: -1 }).limit(5),
      Address.find({
        userId: req.user._id,
        isDeleted: false,
        $or: [{ isDefault: true }, { isDefaultPickup: true }, { isDefaultDrop: true }],
      }),
    ]);
    res.json({
      success: true,
      recommendations: {
        favorites: favorites.map(formatAddress),
        recent: recent.map(formatAddress),
        defaults: defaults.map(formatAddress),
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getAddress = async (req, res, next) => {
  try {
    const address = await Address.findOne({ _id: req.params.id, userId: req.user._id, isDeleted: false });
    if (!address) return res.status(404).json({ success: false, message: 'Address not found' });
    res.json({ success: true, address: formatAddress(address) });
  } catch (error) {
    next(error);
  }
};

exports.createAddress = async (req, res, next) => {
  try {
    if (!['home', 'office', 'custom'].includes(req.body.type)) {
      return res.status(400).json({ success: false, message: 'Invalid address type' });
    }
    const payload = buildAddressPayload(req.body);
    const duplicate = await checkDuplicate(req.user._id, payload);
    if (duplicate) {
      return res.status(400).json({ success: false, message: 'Duplicate address already exists nearby' });
    }

    if (payload.isDefault || req.body.isDefault) {
      await Address.updateMany({ userId: req.user._id, type: payload.type, isDeleted: false }, { isDefault: false });
      payload.isDefault = true;
    }

    const address = await Address.create({ userId: req.user._id, ...payload });
    await logActivity(req.user._id, 'address_created', { type: payload.type, addressId: address._id }, req);
    await notifyAddressUpdate(req.user._id, 'Address Saved', `Your ${payload.type} address has been saved.`);

    res.status(201).json({ success: true, message: 'Address saved', address: formatAddress(address) });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || 'Failed to save address' });
  }
};

exports.updateAddress = async (req, res, next) => {
  try {
    const address = await Address.findOne({ _id: req.params.id, userId: req.user._id, isDeleted: false });
    if (!address) return res.status(404).json({ success: false, message: 'Address not found' });

    const payload = buildAddressPayload({ ...address.toObject(), ...req.body, type: req.body.type || address.type });
    const duplicate = await checkDuplicate(req.user._id, payload, address._id);
    if (duplicate) {
      return res.status(400).json({ success: false, message: 'Duplicate address already exists nearby' });
    }

    Object.assign(address, payload);
    await address.save();
    await logActivity(req.user._id, 'address_updated', { addressId: address._id }, req);
    await notifyAddressUpdate(req.user._id, 'Address Updated', 'Your address has been updated.');

    res.json({ success: true, message: 'Address updated', address: formatAddress(address) });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || 'Failed to update address' });
  }
};

exports.deleteAddress = async (req, res, next) => {
  try {
    const address = await Address.findOne({ _id: req.params.id, userId: req.user._id, isDeleted: false });
    if (!address) return res.status(404).json({ success: false, message: 'Address not found' });

    address.isDeleted = true;
    await address.save();
    await logActivity(req.user._id, 'address_deleted', { addressId: address._id }, req);

    res.json({ success: true, message: 'Address deleted' });
  } catch (error) {
    next(error);
  }
};

exports.setDefaultAddress = async (req, res, next) => {
  try {
    const { role = 'general' } = req.body;
    const address = await Address.findOne({ _id: req.params.id, userId: req.user._id, isDeleted: false });
    if (!address) return res.status(404).json({ success: false, message: 'Address not found' });

    if (role === 'pickup') {
      await Address.updateMany({ userId: req.user._id, isDeleted: false }, { isDefaultPickup: false });
      address.isDefaultPickup = true;
    } else if (role === 'drop') {
      await Address.updateMany({ userId: req.user._id, isDeleted: false }, { isDefaultDrop: false });
      address.isDefaultDrop = true;
    } else {
      await Address.updateMany({ userId: req.user._id, type: address.type, isDeleted: false }, { isDefault: false });
      address.isDefault = true;
    }

    await address.save();
    await logActivity(req.user._id, 'address_default_set', { addressId: address._id, role }, req);

    res.json({ success: true, message: 'Default address updated', address: formatAddress(address) });
  } catch (error) {
    next(error);
  }
};

exports.toggleFavorite = async (req, res, next) => {
  try {
    const address = await Address.findOne({ _id: req.params.id, userId: req.user._id, isDeleted: false });
    if (!address) return res.status(404).json({ success: false, message: 'Address not found' });

    address.isFavorite = !address.isFavorite;
    await address.save();
    res.json({ success: true, message: address.isFavorite ? 'Added to favorites' : 'Removed from favorites', address: formatAddress(address) });
  } catch (error) {
    next(error);
  }
};

exports.recordUsage = async (req, res, next) => {
  try {
    const address = await Address.findOne({ _id: req.params.id, userId: req.user._id, isDeleted: false });
    if (!address) return res.status(404).json({ success: false, message: 'Address not found' });

    address.useCount += 1;
    address.lastUsedAt = new Date();
    await address.save();

    res.json({ success: true, address: formatAddress(address) });
  } catch (error) {
    next(error);
  }
};

exports.reverseGeocode = async (req, res, next) => {
  try {
    const lat = parseFloat(req.body.lat);
    const lng = parseFloat(req.body.lng);
    if (!validateCoords(lat, lng)) {
      return res.status(400).json({ success: false, message: 'Invalid coordinates' });
    }
    const result = await reverseGeocode(lat, lng);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(503).json({ success: false, message: 'Reverse geocoding failed' });
  }
};

exports.searchAddresses = async (req, res, next) => {
  try {
    const results = await searchAddresses(req.query.q, Number(req.query.limit) || 8);
    res.json({ success: true, results });
  } catch (error) {
    res.status(503).json({ success: false, message: 'Address search failed' });
  }
};

exports.detectGpsLocation = async (req, res, next) => {
  try {
    const lat = parseFloat(req.body.lat);
    const lng = parseFloat(req.body.lng);
    const accuracy = req.body.accuracy ? parseFloat(req.body.accuracy) : undefined;
    if (!validateCoords(lat, lng)) {
      return res.status(400).json({ success: false, message: 'Invalid coordinates' });
    }

    let geocoded = { fullAddress: '', city: '', state: '', country: 'India' };
    try {
      geocoded = await reverseGeocode(lat, lng);
    } catch {
      geocoded.fullAddress = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }

    const signalStatus = accuracy == null ? 'good' : accuracy <= 20 ? 'good' : accuracy <= 100 ? 'fair' : 'poor';

    const history = await LocationHistory.create({
      userId: req.user._id,
      lat,
      lng,
      accuracy,
      fullAddress: geocoded.fullAddress,
      source: 'gps',
      signalStatus,
    });

    res.json({
      success: true,
      location: { lat, lng, accuracy, signalStatus, ...geocoded },
      historyId: history._id,
    });
  } catch (error) {
    next(error);
  }
};

exports.saveGpsLocation = async (req, res, next) => {
  try {
    const payload = buildAddressPayload({
      ...req.body,
      type: req.body.type || 'custom',
      customLabel: req.body.customLabel || 'Current Location',
      fullAddress: req.body.fullAddress || buildFullAddress(req.body),
    });

    const address = await Address.create({
      userId: req.user._id,
      ...payload,
      isVerified: true,
    });

    await LocationHistory.create({
      userId: req.user._id,
      lat: payload.lat,
      lng: payload.lng,
      accuracy: payload.accuracy,
      fullAddress: payload.fullAddress,
      source: 'gps',
    });

    await logActivity(req.user._id, 'gps_location_saved', { addressId: address._id }, req);
    res.status(201).json({ success: true, message: 'Current location saved', address: formatAddress(address) });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || 'Failed to save location' });
  }
};

exports.getLocationHistory = async (req, res, next) => {
  try {
    const history = await LocationHistory.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(Number(req.query.limit) || 20);
    res.json({ success: true, history });
  } catch (error) {
    next(error);
  }
};

exports.getLastKnownLocation = async (req, res, next) => {
  try {
    const last = await LocationHistory.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, location: last });
  } catch (error) {
    next(error);
  }
};

exports.calculateRoute = async (req, res, next) => {
  try {
    const fromLat = parseFloat(req.query.fromLat);
    const fromLng = parseFloat(req.query.fromLng);
    const toLat = parseFloat(req.query.toLat);
    const toLng = parseFloat(req.query.toLng);
    if (![fromLat, fromLng, toLat, toLng].every(Number.isFinite)) {
      return res.status(400).json({ success: false, message: 'Invalid coordinates' });
    }
    const distanceKm = getDistanceKm(fromLat, fromLng, toLat, toLng);
    const durationMinutes = estimateDurationMinutes(distanceKm);
    res.json({
      success: true,
      route: {
        distanceKm: Math.round(distanceKm * 100) / 100,
        durationMinutes,
        etaMinutes: durationMinutes,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.shareAddress = async (req, res, next) => {
  try {
    const address = await Address.findOne({ _id: req.params.id, userId: req.user._id, isDeleted: false });
    if (!address) return res.status(404).json({ success: false, message: 'Address not found' });

    const shareUrl = `https://www.google.com/maps/search/?api=1&query=${address.lat},${address.lng}`;
    res.json({
      success: true,
      share: {
        text: address.fullAddress,
        mapsUrl: shareUrl,
        coordinates: { lat: address.lat, lng: address.lng },
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.verifyAddress = async (req, res, next) => {
  try {
    const address = await Address.findOne({ _id: req.params.id, userId: req.user._id, isDeleted: false });
    if (!address) return res.status(404).json({ success: false, message: 'Address not found' });

    address.isVerified = true;
    await address.save();
    await logActivity(req.user._id, 'address_verified', { addressId: address._id }, req);

    res.json({ success: true, message: 'Address verified', address: formatAddress(address) });
  } catch (error) {
    next(error);
  }
};
