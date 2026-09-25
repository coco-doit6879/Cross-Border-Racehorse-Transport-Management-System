const User = require('../models/User');

exports.getOperationalStaff = async (req, res, next) => {
  try {
    const users = await User.find({ role: { $in: ['DRIVER', 'ESCORT'] } }).select('username fullName email phone role isActive').sort({ role: 1, fullName: 1 });
    res.json({ success: true, count: users.length, data: users });
  } catch (error) { next(error); }
};

// @desc    Get all users (Filtered by role or search term)
// @route   GET /api/users
// @access  Private (LOGISTICS_MANAGER)
exports.getUsers = async (req, res, next) => {
  try {
    const { role, search } = req.query;
    let query = {};

    if (role) {
      query.role = role;
    }

    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query).select('-password').sort({ createdAt: -1 });

    res.json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single user details by ID
// @route   GET /api/users/:id
// @access  Private (LOGISTICS_MANAGER)
exports.getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new user (Manager creation)
// @route   POST /api/users
// @access  Private (LOGISTICS_MANAGER)
exports.createUser = async (req, res, next) => {
  try {
    const { fullName, email, password, role, phone } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    const user = await User.create({
      fullName,
      email,
      password: password || '123456',
      role: role || 'CUSTOMER',
      phone
    });

    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json({
      success: true,
      data: userResponse
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user details
// @route   PUT /api/users/:id
// @access  Private (LOGISTICS_MANAGER)
exports.updateUser = async (req, res, next) => {
  try {
    const { fullName, email, role, phone } = req.body;

    let user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check email uniqueness if email is changed
    if (email && email !== user.email) {
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        return res.status(400).json({ message: 'Email is already in use by another user' });
      }
    }

    user = await User.findByIdAndUpdate(
      req.params.id,
      { fullName, email, role, phone },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private (LOGISTICS_MANAGER)
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent manager from deleting their own account
    if (user._id.toString() === req.user.id.toString()) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }

    await user.deleteOne();

    res.json({
      success: true,
      message: 'User removed successfully'
    });
  } catch (error) {
    next(error);
  }
};
