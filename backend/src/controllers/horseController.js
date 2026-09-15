const Horse = require('../models/Horse');

// @desc    Get all horses (Filterable by ownerId)
// @route   GET /api/horses
// @access  Private
exports.getHorses = async (req, res, next) => {
  try {
    let query = {};
    if (req.user.role === 'CUSTOMER') {
      query.ownerId = req.user.id;
    }
    const horses = await Horse.find(query).populate('ownerId', 'fullName email phone');
    res.json({ success: true, count: horses.length, data: horses });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single horse details
// @route   GET /api/horses/:id
// @access  Private
exports.getHorseById = async (req, res, next) => {
  try {
    const horse = await Horse.findById(req.params.id).populate('ownerId', 'fullName email phone');
    if (!horse) {
      return res.status(404).json({ message: 'Horse not found' });
    }
    res.json({ success: true, data: horse });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new horse profile
// @route   POST /api/horses
// @access  Private (CUSTOMER, LOGISTICS_MANAGER, TRANSPORT_SPECIALIST)
exports.createHorse = async (req, res, next) => {
  try {
    const { name, microchipId, feiPassportNo, breed, age, weight, medicalHistory, ownerId } = req.body;

    const existingChip = await Horse.findOne({ microchipId });
    if (existingChip) {
      return res.status(400).json({ message: 'Horse with this microchip ID already exists' });
    }

    const horse = await Horse.create({
      name,
      microchipId,
      feiPassportNo,
      breed,
      age,
      weight,
      medicalHistory,
      ownerId: req.user.role === 'CUSTOMER' ? req.user.id : (ownerId || req.user.id)
    });

    res.status(201).json({ success: true, data: horse });
  } catch (error) {
    next(error);
  }
};

// @desc    Update horse details
// @route   PUT /api/horses/:id
// @access  Private
exports.updateHorse = async (req, res, next) => {
  try {
    let horse = await Horse.findById(req.params.id);
    if (!horse) {
      return res.status(404).json({ message: 'Horse not found' });
    }

    horse = await Horse.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.json({ success: true, data: horse });
  } catch (error) {
    next(error);
  }
};
