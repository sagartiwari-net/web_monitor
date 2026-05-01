import jwt from "jsonwebtoken";


export const sendTokenResponse = (user, statusCode, res, message) => {
 
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });

  const options = {
    expires: new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000 
    ),
    httpOnly: true,
  };

  if (process.env.NODE_ENV === "production") {
    options.secure = true;
  }

  const userData = {
    id: user._id,
    fullname: user.fullname,
    email: user.email,
    isVerified: user.isVerified,
    provider: user.provider,
  };

  res
    .status(statusCode)
    .cookie("token", token, options)
    .json({
      success: true,
      message,
      user: userData,
      token,
    });
};
