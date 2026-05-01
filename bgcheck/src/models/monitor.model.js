import mongoose from "mongoose";

const monitorSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["http", "https", "ping"],
      default: "https",
    },
    interval: {
      type: Number,
      default: 5, 
    },
    status: {
      type: String,
      enum: ["up", "down", "paused", "pending"],
      default: "pending",
    },
    lastChecked: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    uptimePercentage: {
      type: Number,
      default: 100,
    },
  },
  {
    timestamps: true,
  }
);

const Monitor = mongoose.model("Monitor", monitorSchema);
export default Monitor;
