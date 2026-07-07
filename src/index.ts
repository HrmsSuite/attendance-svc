import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import router from "./routers";
import { errorHandler } from "./common/errorhandlers";
import { Connectdb } from "./common/Db/connect";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const allowedOrigins = [
  "http://localhost:5173",
  "https://hrms-suite.netlify.app",
  "https://dev-hrms-suite.vercel.app/",
];
app.use(
   cors({
    origin: function (origin, callback) {
      // Allow requests without an Origin header (e.g. Postman)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(router);

app.use(errorHandler);

Connectdb().then(() => {
  app.listen(PORT, () => {
    console.log(`Attendence service running on port ${PORT}`);
  });
});
