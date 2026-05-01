import app from "./src/app.js";
import connectDB from "./src/config/db.js";
import { startMonitoring } from "./src/jobs/monitor.job.js";

connectDB();
startMonitoring();

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

process.on("unhandledRejection", (err, promise) => {
  console.log(`Error: ${err.message}`);

  server.close(() => process.exit(1));
});
