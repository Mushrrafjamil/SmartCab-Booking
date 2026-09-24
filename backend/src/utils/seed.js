const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const Driver = require('../models/Driver');
const Vehicle = require('../models/Vehicle');
const Coupon = require('../models/Coupon');
const Ride = require('../models/Ride');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');

dotenv.config();

const seedDB = async () => {
  try {
    console.log('Connecting to database for seeding...');
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/cab-booking');
    console.log('Connected.');

    // Clear existing data
    console.log('Cleaning collections...');
    await User.deleteMany({});
    await Driver.deleteMany({});
    await Vehicle.deleteMany({});
    await Coupon.deleteMany({});
    await Ride.deleteMany({});
    await Transaction.deleteMany({});
    await Notification.deleteMany({});
    console.log('Cleared existing data.');

    // 1. Create Admin
    console.log('Creating Admin...');
    const adminUser = await User.create({
      name: 'System Admin',
      email: 'admin@cab.com',
      phone: '9999999999',
      password: 'Admin@123',
      role: 'super_admin',
      acceptTerms: true,
      isEmailVerified: true,
      isPhoneVerified: true,
    });

    // 2. Create Passengers
    console.log('Creating Passengers...');
    const passengersData = [
      { name: 'John Doe', email: 'john@gmail.com', phone: '9876543210', password: 'User@123', walletBalance: 500, acceptTerms: true, isEmailVerified: true, isPhoneVerified: true },
      { name: 'Alice Smith', email: 'alice@gmail.com', phone: '9876543211', password: 'User@123', walletBalance: 200, acceptTerms: true, isEmailVerified: true, isPhoneVerified: true },
      { name: 'Bob Johnson', email: 'bob@gmail.com', phone: '9876543212', password: 'User@123', walletBalance: 0, acceptTerms: true, isEmailVerified: true, isPhoneVerified: true }
    ];
    const passengers = await User.create(passengersData);

    // 3. Create Drivers
    console.log('Creating Drivers & Profiles...');
    const driversUserData = [
      { name: 'Ravi Kumar', email: 'ravi@gmail.com', phone: '9876543220', password: 'Driver@123', role: 'driver', acceptTerms: true, isEmailVerified: true, isPhoneVerified: true },
      { name: 'Amit Singh', email: 'amit@gmail.com', phone: '9876543221', password: 'Driver@123', role: 'driver', acceptTerms: true, isEmailVerified: true, isPhoneVerified: true },
      { name: 'Suresh Patel', email: 'suresh@gmail.com', phone: '9876543222', password: 'Driver@123', role: 'driver', acceptTerms: true, isEmailVerified: true, isPhoneVerified: true }
    ];
    const driverUsers = await User.create(driversUserData);

    const driversData = [
      {
        userId: driverUsers[0]._id,
        licenseNumber: 'DL-12345678901',
        aadhaarNumber: '123456789012',
        panNumber: 'ABCDE1234F',
        verificationStatus: 'approved',
        status: 'online',
        currentLocation: { lat: 12.971598, lng: 77.594566 } // Bengaluru Center
      },
      {
        userId: driverUsers[1]._id,
        licenseNumber: 'DL-12345678902',
        aadhaarNumber: '123456789013',
        panNumber: 'ABCDE1234G',
        verificationStatus: 'approved',
        status: 'online',
        currentLocation: { lat: 12.9784, lng: 77.6408 } // Indiranagar
      },
      {
        userId: driverUsers[2]._id,
        licenseNumber: 'DL-12345678903',
        aadhaarNumber: '123456789014',
        panNumber: 'ABCDE1234H',
        verificationStatus: 'approved',
        status: 'online',
        currentLocation: { lat: 12.9279, lng: 77.6271 } // Koramangala
      }
    ];
    const drivers = await Driver.create(driversData);

    // 4. Create Vehicles
    console.log('Creating Vehicles...');
    const vehiclesData = [
      {
        driverId: drivers[0]._id,
        vehicleNumber: 'KA-01-AB-1234',
        type: 'sedan',
        brand: 'Honda',
        model: 'Amaze',
        color: 'White',
        seatingCapacity: 4,
        fuelType: 'petrol',
        insuranceNumber: 'INS-99999',
        rcBookNumber: 'RC-99999',
        verificationStatus: 'approved',
        status: 'available'
      },
      {
        driverId: drivers[1]._id,
        vehicleNumber: 'KA-03-CD-5678',
        type: 'mini',
        brand: 'Maruti',
        model: 'Swift',
        color: 'Red',
        seatingCapacity: 4,
        fuelType: 'cng',
        insuranceNumber: 'INS-88888',
        rcBookNumber: 'RC-88888',
        verificationStatus: 'approved',
        status: 'available'
      },
      {
        driverId: drivers[2]._id,
        vehicleNumber: 'KA-05-EF-9012',
        type: 'suv',
        brand: 'Toyota',
        model: 'Innova',
        color: 'Silver',
        seatingCapacity: 6,
        fuelType: 'diesel',
        insuranceNumber: 'INS-77777',
        rcBookNumber: 'RC-77777',
        verificationStatus: 'approved',
        status: 'available'
      }
    ];
    const vehicles = await Vehicle.create(vehiclesData);

    // Link vehicle to driver
    for (let i = 0; i < drivers.length; i++) {
      drivers[i].vehicleId = vehicles[i]._id;
      await drivers[i].save();
    }

    // 5. Create Coupons
    console.log('Creating Coupons...');
    const couponsData = [
      {
        code: 'WELCOME50',
        discountPercentage: 50,
        maxDiscount: 100,
        minRideValue: 50,
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        isActive: true
      },
      {
        code: 'CABFREE',
        discountPercentage: 100,
        maxDiscount: 200,
        minRideValue: 100,
        expiryDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days
        isActive: true
      },
      {
        code: 'RIDE10',
        discountPercentage: 10,
        maxDiscount: 50,
        minRideValue: 0,
        expiryDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
        isActive: true
      }
    ];
    await Coupon.create(couponsData);

    console.log('Database Seeding Completed Successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error.message);
    process.exit(1);
  }
};

seedDB();
