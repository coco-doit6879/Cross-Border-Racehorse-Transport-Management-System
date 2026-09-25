const mongoose = require('mongoose');
const User = require('../models/User');

const newDrivers = [
  { username: 'driver_2', fullName: 'Đoàn Văn Hùng', email: 'hung.doan@cbrt.com', phone: '0908887766', role: 'DRIVER', password: 'password123' },
  { username: 'driver_3', fullName: 'Nguyễn Tấn Đạt', email: 'dat.nguyen@cbrt.com', phone: '0919998877', role: 'DRIVER', password: 'password123' },
  { username: 'driver_4', fullName: 'Hoàng Xuân Trường', email: 'truong.hoang@cbrt.com', phone: '0937776655', role: 'DRIVER', password: 'password123' },
  { username: 'driver_5', fullName: 'Trịnh Thanh Sơn', email: 'son.trinh@cbrt.com', phone: '0946665544', role: 'DRIVER', password: 'password123' },
  { username: 'driver_6', fullName: 'Phan Văn Hữu', email: 'huu.phan@cbrt.com', phone: '0965554433', role: 'DRIVER', password: 'password123' }
];

async function seedNewDrivers() {
  await mongoose.connect('mongodb://127.0.0.1:27017/cbrt_db');
  for (const drv of newDrivers) {
    const exists = await User.findOne({ $or: [{ email: drv.email }, { username: drv.username }] });
    if (!exists) {
      await User.create(drv);
      console.log('Added driver:', drv.fullName, drv.username);
    } else {
      console.log('Already exists:', drv.fullName);
    }
  }
  const total = await User.countDocuments({ role: { $in: ['DRIVER', 'DRIVER_ESCORT'] } });
  console.log('Total drivers in DB now:', total);
  await mongoose.disconnect();
}

seedNewDrivers().catch(console.error);
