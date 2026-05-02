import mongoose from "mongoose";

const auditSchema = new mongoose.Schema(
  {
    monitor: { type: mongoose.Schema.Types.ObjectId, ref: "Monitor", required: true },
    url: { type: String, required: true },
    perfScore: { type: Number, default: 0 },
    accessScore: { type: Number, default: 0 },
    bestPracticesScore: { type: Number, default: 0 },
    seoScore: { type: Number, default: 0 },
    lcp: { type: Number },    // Largest Contentful Paint (ms)
    fid: { type: Number },    // First Input Delay (ms)
    cls: { type: Number },    // Cumulative Layout Shift
    fcp: { type: Number },    // First Contentful Paint (ms)
    ttfb: { type: Number },   // Time to First Byte (ms)
    si: { type: Number },     // Speed Index (ms)
    aiAnalysis: { type: String },
    rawData: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

const Audit = mongoose.model("Audit", auditSchema);
export default Audit;
