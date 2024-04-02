import express from "express";
import {
  getAllReviews,
  getProductRatings,
  addReview,
  deleteReview,
} from "../controllers/review.js";
import { isAuthenticated } from "../middlewares/auth.js";

const router = express.Router();

router.get("/:productId", getAllReviews);
router.get("/ratings/:productId", getProductRatings);
router.post("/create", isAuthenticated, addReview);
router.delete("/:id", isAuthenticated, deleteReview);

export default router;
