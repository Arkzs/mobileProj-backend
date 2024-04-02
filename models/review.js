import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema({
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Products',
      required: true,
    },
    rating: {
      type: Number,
      required: true,
    },
    comment: {
      type: String,
      required: [true, 'Please add a comment'],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  });

  reviewSchema.virtual('userName', {
    ref: 'User',
    localField: 'user',
    foreignField: '_id',
    justOne: true,
    options: { select: 'name' }
  });
  
  export const Review = mongoose.model('Review', reviewSchema);
  