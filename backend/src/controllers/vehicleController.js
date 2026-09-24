const Vehicle = require('../models/Vehicle');
const Driver = require('../models/Driver');

const getUserId = (req) => req.user._id || req.user.id;

const VEHICLE_TYPES = ['mini', 'sedan', 'suv', 'luxury', 'auto', 'bike', 'xl', 'premium', 'electric'];
const FUEL_TYPES = ['petrol', 'diesel', 'cng', 'electric'];

const validateVehicleInput = (body) => {
  const errors = [];
  const vehicleNumber = body.vehicleNumber?.trim();
  const type = (body.type || body.vehicleType || '').toLowerCase();
  const brand = body.brand?.trim();
  const model = body.model?.trim();
  const color = body.color?.trim();
  const insuranceNumber = body.insuranceNumber?.trim();
  const rcBookNumber = body.rcBookNumber?.trim();
  const seatingCapacity = Number(body.seatingCapacity);
  const fuelType = (body.fuelType || 'petrol').toLowerCase();

  if (!vehicleNumber) errors.push('Vehicle number is required');
  if (!type) errors.push('Vehicle type is required');
  else if (!VEHICLE_TYPES.includes(type)) errors.push(`Invalid vehicle type. Allowed: ${VEHICLE_TYPES.join(', ')}`);
  if (!brand) errors.push('Brand is required');
  if (!model) errors.push('Model is required');
  if (!color) errors.push('Color is required');
  if (!insuranceNumber) errors.push('Insurance number is required');
  if (!rcBookNumber) errors.push('RC book number is required');
  if (!seatingCapacity || seatingCapacity < 1 || seatingCapacity > 20) errors.push('Seating capacity must be between 1 and 20');
  if (!FUEL_TYPES.includes(fuelType)) errors.push(`Invalid fuel type. Allowed: ${FUEL_TYPES.join(', ')}`);

  if (errors.length) return { errors };

  return {
    data: {
      vehicleNumber: vehicleNumber.toUpperCase(),
      type,
      brand,
      model,
      color,
      seatingCapacity,
      fuelType,
      insuranceNumber,
      rcBookNumber,
      pollutionCertificate: body.pollutionCertificate?.trim() || '',
      insuranceExpiry: body.insuranceExpiry || undefined,
      fitnessExpiry: body.fitnessExpiry || undefined,
    },
  };
};

exports.addVehicle = async (req, res, next) => {
  try {
    const validation = validateVehicleInput(req.body);
    if (validation.errors) {
      return res.status(400).json({ success: false, message: validation.errors.join('. ') });
    }

    const driver = await Driver.findOne({ userId: getUserId(req) });
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver profile not found. Please complete driver registration first' });
    }

    const existingForDriver = await Vehicle.findOne({ driverId: driver._id });
    if (existingForDriver) {
      return res.status(409).json({ success: false, message: 'You already have a vehicle registered. Update or delete it first.' });
    }

    const vehicleExists = await Vehicle.findOne({ vehicleNumber: validation.data.vehicleNumber });
    if (vehicleExists) {
      return res.status(409).json({ success: false, message: 'Vehicle with this plate number already registered' });
    }

    const vehicle = await Vehicle.create({
      driverId: driver._id,
      ...validation.data,
      verificationStatus: 'pending',
      status: 'offline',
    });

    driver.vehicleId = vehicle._id;
    driver.vehicleNumber = vehicle.vehicleNumber;
    driver.vehicleType = vehicle.type;
    driver.vehicleBrand = vehicle.brand;
    driver.vehicleModel = vehicle.model;
    driver.vehicleColor = vehicle.color;
    await driver.save();

    res.status(201).json({ success: true, message: 'Vehicle added successfully. Verification is pending approval', vehicle });
  } catch (error) {
    next(error);
  }
};

exports.getVehicle = async (req, res, next) => {
  try {
    const driver = await Driver.findOne({ userId: getUserId(req) });
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    const vehicle = await Vehicle.findOne({ driverId: driver._id });
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'No vehicle registered for this driver account' });
    }

    res.status(200).json({ success: true, vehicle });
  } catch (error) {
    next(error);
  }
};

exports.updateVehicle = async (req, res, next) => {
  try {
    const driver = await Driver.findOne({ userId: getUserId(req) });
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    const vehicle = await Vehicle.findOne({ driverId: driver._id });
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle profile not found' });
    }

    const { brand, model, color, seatingCapacity, fuelType, insuranceNumber, rcBookNumber, pollutionCertificate } = req.body;
    if (brand) vehicle.brand = brand.trim();
    if (model) vehicle.model = model.trim();
    if (color) vehicle.color = color.trim();
    if (seatingCapacity) vehicle.seatingCapacity = Number(seatingCapacity);
    if (fuelType && FUEL_TYPES.includes(fuelType.toLowerCase())) vehicle.fuelType = fuelType.toLowerCase();
    if (insuranceNumber) vehicle.insuranceNumber = insuranceNumber.trim();
    if (rcBookNumber) vehicle.rcBookNumber = rcBookNumber.trim();
    if (pollutionCertificate !== undefined) vehicle.pollutionCertificate = pollutionCertificate;

    vehicle.verificationStatus = 'pending';
    await vehicle.save();

    res.status(200).json({ success: true, message: 'Vehicle updated. Re-verification pending', vehicle });
  } catch (error) {
    next(error);
  }
};

exports.deleteVehicle = async (req, res, next) => {
  try {
    const driver = await Driver.findOne({ userId: getUserId(req) });
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    const vehicle = await Vehicle.findOneAndDelete({ driverId: driver._id });
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }

    driver.vehicleId = null;
    await driver.save();

    res.status(200).json({ success: true, message: 'Vehicle deleted successfully' });
  } catch (error) {
    next(error);
  }
};
