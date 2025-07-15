const rateLimit = require("express-rate-limit")

const otpRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: {
    status: 429,
    message: "Too many OTP requests from this IP, please try again after a minute."
  },
  standardHeaders: true,
  legacyHeaders: false, 
});

module.exports = {
    otpRateLimiter
}