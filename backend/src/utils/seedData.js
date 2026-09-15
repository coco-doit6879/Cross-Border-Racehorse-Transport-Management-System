const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/../../.env' });

const User = require('../models/User');
const Horse = require('../models/Horse');
const Order = require('../models/Order');

const seedData = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cbrt_db';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB for Seeding...');

    // Clear existing collections
    await User.deleteMany({});
    await Horse.deleteMany({});
    await Order.deleteMany({});

    console.log('Cleared existing data.');

    // Seed Users
    const manager = await User.create({
      fullName: 'Alex Manager',
      email: 'manager@cbrt.com',
      password: 'password123',
      role: 'LOGISTICS_MANAGER',
      phone: '+1 555-0192'
    });

    const specialist = await User.create({
      fullName: 'Sarah Specialist',
      email: 'specialist@cbrt.com',
      password: 'password123',
      role: 'TRANSPORT_SPECIALIST',
      phone: '+1 555-0193'
    });

    const coordinator = await User.create({
      fullName: 'Chris Coordinator',
      email: 'coordinator@cbrt.com',
      password: 'password123',
      role: 'ROUTE_COORDINATOR',
      phone: '+1 555-0194'
    });

    const driver = await User.create({
      fullName: 'David Driver',
      email: 'driver@cbrt.com',
      password: 'password123',
      role: 'DRIVER_ESCORT',
      phone: '+1 555-0195'
    });

    const customer = await User.create({
      fullName: 'Edward Owner (Royal Stables)',
      email: 'customer@cbrt.com',
      password: 'password123',
      role: 'CUSTOMER',
      phone: '+1 555-0196'
    });

    console.log('Created Users: Manager, Specialist, Coordinator, Driver, Customer.');

    // Seed Horses
    const horse1 = await Horse.create({
      name: 'Thunderbolt Star',
      microchipId: '985141000123456',
      feiPassportNo: 'FEI-2026-US-8891',
      breed: 'Thoroughbred',
      age: 5,
      weight: 520,
      medicalHistory: 'Fully vaccinated (Equine Influenza, Coggins negative)',
      ownerId: customer._id
    });

    const horse2 = await Horse.create({
      name: 'Pegasus Spirit',
      microchipId: '985141000654321',
      feiPassportNo: 'FEI-2026-FR-7712',
      breed: 'Arabian',
      age: 4,
      weight: 480,
      medicalHistory: 'No chronic diseases, fit for long distance transport',
      ownerId: customer._id
    });

    console.log('Created Horses: Thunderbolt Star, Pegasus Spirit.');

    // Seed Sample Order
    const order = await Order.create({
      orderCode: 'TR-2026-0001',
      customerId: customer._id,
      origin: 'Kenting Racecourse, SG',
      destination: 'Chiba Equestrian Club, JP',
      horses: [horse1._id, horse2._id],
      status: 'APPROVED'
    });

    console.log(`Created Sample Order: ${order.orderCode}`);

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
