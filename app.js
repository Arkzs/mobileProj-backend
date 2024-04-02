import express from "express";
import {config} from "dotenv"; 
import { errorMiddleware } from "./middlewares/error.js";
import cookieParser from "cookie-parser";
import cors from "cors";

config({
    path:"./data/config.env",
});

export const app = express();

//using middlewares
app.use(express.json());
app.use(cookieParser());
app.use(
    cors({
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE"],
      origin: [process.env.FRONTEND_URI_1, process.env.FRONTEND_URI_2],
    })
  );

app.get("/", (req, res, next) => {
    res.send("working");
})

// Importing routers Here
import user from "./routes/user.js";
import product from "./routes/product.js";
import order from "./routes/order.js";
import review from "./routes/review.js";
app.use("/api/v1/user",user);
app.use("/api/v1/product",product);
app.use("/api/v1/order",order);
app.use("/api/v1/review",review);

app.use(errorMiddleware)