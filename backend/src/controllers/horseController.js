const Horse = require('../models/Horse');
const { logAudit } = require('../utils/auditLogger');

// @desc    Get all horses (Filterable by ownership / role)
// @route   GET /api/v1/horses
// @access  Private (horse:create_own / horse:manage_all)
exports.getHorses = async (req, res, next) => {
  try {
    let query = {};
    const permissions = req.user.effectivePermissions || [];

    // Customers or users without horse:manage_all can only view their own horses
    if (!permissions.includes('horse:manage_all')) {
      query.ownerId = req.user._id;
    } else if (req.query.ownerId) {
      query.ownerId = req.query.ownerId;
    }

    const horses = await Horse.find(query).populate('ownerId', 'fullName email phone username');
    res.json({
      success: true,
      count: horses.length,
      data: horses
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single horse details
// @route   GET /api/v1/horses/:id
// @access  Private (horse:create_own / horse:manage_all)
exports.getHorseById = async (req, res, next) => {
  try {
    const horse = await Horse.findById(req.params.id).populate('ownerId', 'fullName email phone username');
    if (!horse) {
      return res.status(404).json({
        success: false,
        message: 'Horse not found'
      });
    }

    const permissions = req.user.effectivePermissions || [];
    // Enforce ownership check for customers
    if (!permissions.includes('horse:manage_all') && horse.ownerId._id.toString() !== req.user._id.toString()) {
      await logAudit({
        actorId: req.user._id,
        action: 'HORSE_READ',
        resource: 'Horse',
        resourceId: horse._id.toString(),
        result: 'DENIED',
        errorMessage: 'User attempted to access horse owned by another user',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to access this horse'
      });
    }

    res.json({
      success: true,
      data: horse
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new horse profile
// @route   POST /api/v1/horses
// @access  Private (horse:create_own / horse:manage_all)
exports.createHorse = async (req, res, next) => {
  try {
    const { microchipId, feiPassportNumber, name, breed, dateOfBirth, gender, weightKg, passportScanUrl, photos, medicalHistoryNotes, ownerId } = req.body;

    if (!microchipId || !feiPassportNumber || !name || !breed || !dateOfBirth || !gender || !weightKg || !passportScanUrl) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required horse fields'
      });
    }

    // Microchip validation (10-18 alphanumeric)
    if (!/^[A-Za-z0-9]{10,18}$/.test(microchipId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Microchip ID format. Must be 10-18 alphanumeric characters.'
      });
    }

    const existingChip = await Horse.findOne({ microchipId });
    if (existingChip) {
      return res.status(400).json({
        success: false,
        message: 'Horse with this Microchip ID already exists'
      });
    }

    const existingPassport = await Horse.findOne({ feiPassportNumber });
    if (existingPassport) {
      return res.status(400).json({
        success: false,
        message: 'Horse with this FEI Passport Number already exists'
      });
    }

    const permissions = req.user.effectivePermissions || [];
    // CUSTOMER role always owns the horse created; privileged role can specify ownerId
    const targetOwnerId = permissions.includes('horse:manage_all') && ownerId ? ownerId : req.user._id;

    const horse = await Horse.create({
      microchipId,
      feiPassportNumber,
      name,
      breed,
      dateOfBirth,
      gender,
      weightKg,
      ownerId: targetOwnerId,
      passportScanUrl,
      photos: photos || [],
      medicalHistoryNotes
    });

    await logAudit({
      actorId: req.user._id,
      action: 'HORSE_CREATE',
      resource: 'Horse',
      resourceId: horse._id.toString(),
      result: 'SUCCESS',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(201).json({
      success: true,
      data: horse
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update horse details
// @route   PUT /api/v1/horses/:id
// @access  Private (horse:create_own / horse:manage_all)
exports.updateHorse = async (req, res, next) => {
  try {
    let horse = await Horse.findById(req.params.id);
    if (!horse) {
      return res.status(404).json({
        success: false,
        message: 'Horse not found'
      });
    }

    const permissions = req.user.effectivePermissions || [];
    if (!permissions.includes('horse:manage_all') && horse.ownerId.toString() !== req.user._id.toString()) {
      await logAudit({
        actorId: req.user._id,
        action: 'HORSE_UPDATE',
        resource: 'Horse',
        resourceId: horse._id.toString(),
        result: 'DENIED',
        errorMessage: 'User attempted to update horse owned by another user',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      return res.status(403).json({
        success: false,
        message: 'Forbidden: You cannot modify another user\'s horse'
      });
    }

    horse = await Horse.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });

    await logAudit({
      actorId: req.user._id,
      action: 'HORSE_UPDATE',
      resource: 'Horse',
      resourceId: horse._id.toString(),
      result: 'SUCCESS',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      data: horse
    });
  } catch (error) {
    next(error);
  }
};
