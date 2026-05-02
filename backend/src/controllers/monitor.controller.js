import Monitor from "../models/monitor.model.js";
import Log from "../models/log.model.js";

const PLAN_LIMITS = {
  free: 3,
  basic: 10,
  pro: 50,
  elite: 200,
};

export const createMonitor = async (req, res) => {
  try {
    const { name, url, type, interval } = req.body;
    const user = req.user;

    const userPlan = typeof user.plan === 'object' ? (user.plan?.type || 'free') : (user.plan || 'free');
    const count = await Monitor.countDocuments({ user: user._id });
    if (count >= PLAN_LIMITS[userPlan]) {
      return res.status(400).json({ message: `Plan limit reached for ${userPlan} plan.` });
    }

    const monitor = await Monitor.create({
      user: user._id,
      name,
      url,
      type,
      interval,
    });

    res.status(201).json({ success: true, data: { monitor } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMonitors = async (req, res) => {
  try {
    const monitors = await Monitor.find({ user: req.user._id });
    res.status(200).json({ success: true, data: monitors });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMonitorDetails = async (req, res) => {
  try {
    const monitor = await Monitor.findOne({ _id: req.params.id, user: req.user._id });
    if (!monitor) return res.status(404).json({ message: "Monitor not found" });

    const logs = await Log.find({ monitor: monitor._id }).sort("-createdAt").limit(100);
    
    res.status(200).json({ success: true, data: { monitor, logs } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateMonitor = async (req, res) => {
  try {
    const monitor = await Monitor.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      { new: true }
    );
    if (!monitor) return res.status(404).json({ message: "Monitor not found" });
    res.status(200).json({ success: true, data: monitor });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteMonitor = async (req, res) => {
  try {
    const monitor = await Monitor.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!monitor) return res.status(404).json({ message: "Monitor not found" });
    await Log.deleteMany({ monitor: monitor._id });
    res.status(200).json({ success: true, message: "Monitor deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const toggleMonitor = async (req, res) => {
  try {
    const monitor = await Monitor.findOne({ _id: req.params.id, user: req.user._id });
    if (!monitor) return res.status(404).json({ message: "Monitor not found" });
    monitor.isActive = !monitor.isActive;
    await monitor.save();
    res.status(200).json({ success: true, data: monitor });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
