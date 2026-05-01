export const validate = (schema) => (req, res, next) => {
  try {
    schema.parse(req.body);
    next();
  } catch (error) {
    console.log("Validation Error:", error.errors[0].message);
    return res.status(400).json({
      success: false,
      message: error.errors[0].message,
    });
  }
};
