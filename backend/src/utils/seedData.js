const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/../../.env' });

const User = require('../models/User');
const Horse = require('../models/Horse');
const Order = require('../models/Order');
const Vehicle = require('../models/Vehicle');

const seedData = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cbrt_db';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB for Seeding...');

    // Clear existing collections
    await User.deleteMany({});
    await Horse.deleteMany({});
    await Order.deleteMany({});
    await Vehicle.deleteMany({});

    console.log('Cleared existing data.');

    // Seed Users
    const manager = await User.create({
      username: 'manager',
      fullName: 'Alex Manager',
      email: 'manager@cbrt.com',
      password: 'password123',
      role: 'LOGISTICS_MANAGER',
      phone: '+1 555-0192'
    });

    const specialist = await User.create({
      username: 'specialist',
      fullName: 'Sarah Specialist',
      email: 'specialist@cbrt.com',
      password: 'password123',
      role: 'TRANSPORT_SPECIALIST',
      phone: '+1 555-0193'
    });

    const coordinator = await User.create({
      username: 'coordinator',
      fullName: 'Chris Coordinator',
      email: 'coordinator@cbrt.com',
      password: 'password123',
      role: 'FLEET_COORDINATOR',
      phone: '+1 555-0194'
    });

    const driver = await User.create({
      username: 'driver',
      fullName: 'David Driver',
      email: 'driver@cbrt.com',
      password: 'password123',
      role: 'DRIVER',
      phone: '+1 555-0195'
    });

    await User.create({
      username: 'escort',
      fullName: 'Emma Escort',
      email: 'escort@cbrt.com',
      password: 'password123',
      role: 'ESCORT',
      phone: '+1 555-0197'
    });

    const customer = await User.create({
      username: 'customer',
      fullName: 'Edward Owner (Royal Stables)',
      email: 'customer@cbrt.com',
      password: 'password123',
      role: 'CUSTOMER',
      phone: '+1 555-0196'
    });

    console.log('Created Users: Manager, Specialist, Coordinator, Driver, Customer.');

    await Vehicle.insertMany([
      { plateNumber: '51C-987.65', name: 'Isuzu Horsebox 2 chỗ', capacityHorses: 2, countryCode: 'VN', registrationExpiresAt: new Date('2028-12-31'), inspectionExpiresAt: new Date('2027-12-31'), status: 'ACTIVE' },
      { plateNumber: '29H-246.80', name: 'Mercedes Atego Horsebox', capacityHorses: 4, countryCode: 'VN', registrationExpiresAt: new Date('2029-06-30'), inspectionExpiresAt: new Date('2027-06-30'), status: 'ACTIVE' }
    ]);

    // Seed Horses
    const horse1 = await Horse.create({
      name: 'Thunderbolt Star',
      microchipId: '985141000123456',
      feiPassportNumber: 'FEI-2026-US-8891',
      breed: 'Thoroughbred',
      dateOfBirth: new Date('2021-05-12'),
      gender: 'STALLION',
      weightKg: 520,
      passportScanUrl: 'https://example.com/scans/passport1.pdf',
      medicalHistoryNotes: 'Fully vaccinated (Equine Influenza, Coggins negative)',
      currentStopId: 'VN-HCM',
      ownerId: customer._id
    });

    const horse2 = await Horse.create({
      name: 'Pegasus Spirit',
      microchipId: '985141000654321',
      feiPassportNumber: 'FEI-2026-FR-7712',
      breed: 'Arabian',
      dateOfBirth: new Date('2022-03-20'),
      gender: 'MARE',
      weightKg: 480,
      passportScanUrl: 'https://example.com/scans/passport2.pdf',
      medicalHistoryNotes: 'No chronic diseases, fit for long distance transport',
      currentStopId: 'VN-HCM',
      ownerId: customer._id
    });

    console.log('Created Horses: Thunderbolt Star, Pegasus Spirit.');

    // Seed Sample Order
    const order = await Order.create({
      bookingCode: 'TR-2026-0001',
      customerId: customer._id,
      horseIds: [horse1._id, horse2._id],
      origin: {
        address: 'Kenting Racecourse, SG',
        countryCode: 'SG',
        coordinates: [103.8198, 1.3521]
      },
      destination: {
        address: 'Chiba Equestrian Club, JP',
        countryCode: 'JP',
        coordinates: [140.1233, 35.6074]
      },
      requestedDepartureDate: new Date('2026-10-01'),
      status: 'APPROVED'
    });

    console.log(`Created Sample Order: ${order.bookingCode}`);

    console.log('\n--- SEEDING COMPLETED SUCCESSFULLY ---');
    console.log('Sample Accounts for testing:');
    console.log('1. Manager:     manager@cbrt.com    / password123');
    console.log('2. Specialist:  specialist@cbrt.com / password123');
    console.log('3. Coordinator: coordinator@cbrt.com/ password123');
    console.log('4. Driver:      driver@cbrt.com     / password123');
    console.log('5. Customer:    customer@cbrt.com   / password123');

    process.exit(0);
  } catch (error) {
    console.error('Seeding Error:', error);
    process.exit(1);
  }
};

seedData();
