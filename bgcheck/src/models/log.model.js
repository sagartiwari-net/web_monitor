import mongoose from "mongoose";

const logSchema = new mongoose.Schema(
  {
    monitor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Monitor",
      required: true,
    },
    status: {
      type: String,
      enum: ["up", "down"],
      required: true,
    },
    responseTime: {
      type: Number, 
    },
    statusCode: {
      type: Number,
    },
    message: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const Log = mongoose.model("Log", logSchema);
export default Log;
