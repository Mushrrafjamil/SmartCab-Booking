const Vehicle = require('../models/Vehicle.model');
const Driver = require('../models/Driver.model');

const createVehicle = async (req, res) => {
  try {
    const driver = await Driver.findOne({ user: req.user._id });
    const vehicle = await Vehicle.create({ ...req.body, driver: driver?._id });
    if (driver) {
      driver.vehicle = vehicle._id;
      await driver.save();
    }
    res.status(201).json({ success: true, data: vehicle });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getVehicles = async (req, res) => {
  try {
    const driver = await Driver.findOne({ user: req.user._id });
    const filter = req.user.role === 'admin' ? {} : { driver: driver?._id };
    const vehicles = await Vehicle.find(filter).populate('driver');
    res.json({ success: true, data: vehicles });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id).populate('driver');
    if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found' });
    res.json({ success: true, data: vehicle });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: vehicle });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteVehicle = async (req, res) => {
  try {
    await Vehicle.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Vehicle deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const verifyVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findByIdAndUpdate(
      req.params.id,
      { isVerified: true, status: 'available' },
      { new: true }
    );
    res.json({ success: true, data: vehicle });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { createVehicle, getVehicles, getVehicle, updateVehicle, deleteVehicle, verifyVehicle };
