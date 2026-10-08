// Centralized Error Handling Middleware
exports.errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || err.status || (err.code === 11000 ? 409 : ['ValidationError', 'CastError'].includes(err.name) ? 400 : res.statusCode === 200 ? 500 : res.statusCode);
  res.status(statusCode).json({
    message: err.code === 11000 ? 'Tài nguyên hoặc chứng từ đã được sử dụng bởi yêu cầu khác. Hãy tải lại và kiểm tra.' : err.message || 'Server Error',
    stack: process.env.NODE_ENV === 'production' ? null : err.stack
  });
};
