import { asyncError } from "../middlewares/error.js";
import { Order } from "../models/order.js";
import { Product } from "../models/product.js";
import ErrorHandler from "../utils/error.js";
import { sendEmail } from "../utils/features.js";

export const createOrder = asyncError(async (req, res, next) => {
    const {
      shippingInfo,
      orderItems,
      paymentMethod,
      paymentInfo,
      itemsPrice,
      taxPrice,
      shippingCharges,
      totalAmount,
    } = req.body;
  
    await Order.create({
      user: req.user._id,
      shippingInfo,
      orderItems,
      paymentMethod,
      paymentInfo,
      itemsPrice,
      taxPrice,
      shippingCharges,
      totalAmount,
    });
  
    for (let i = 0; i < orderItems.length; i++) {
      const product = await Product.findById(orderItems[i].product);
      product.stock -= orderItems[i].quantity;
      await product.save();
    }
  
    // Send email with order details
  const subject = "Order Confirmation";
  const to = req.user.email; // Assuming you have the user's email
  const text = `Thank you for your order!\n\nOrder Details:\n\nOrder ID: \n${shippingInfo}\n`;
  await sendEmail(subject, to, text);

    res.status(201).json({
      success: true,
      message: "Order Placed Successfully",
    });
  });

  export const getAdminOrders = asyncError(async (req, res, next) => {
    const orders = await Order.find({});
  
    res.status(200).json({
      success: true,
      orders,
    });
  });
  
  export const getMyOrders = asyncError(async (req, res, next) => {
    const orders = await Order.find({ user: req.user._id });
  
    res.status(200).json({
      success: true,
      orders,
    });
  });

  export const getOrderDetails = asyncError(async (req, res, next) => {
    const order = await Order.findById(req.params.id);
  
    if (!order) return next(new ErrorHandler("Order Not Found", 404));
  
    res.status(200).json({
      success: true,
      order,
    });
  });

  export const proccessOrder = asyncError(async (req, res, next) => {
    const order = await Order.findById(req.params.id);
    if (!order) return next(new ErrorHandler("Order Not Found", 404));
  
    if (order.orderStatus === "Preparing") order.orderStatus = "Shipped";
    else if (order.orderStatus === "Shipped") {
      order.orderStatus = "Delivered";
      order.deliveredAt = new Date(Date.now());
    } else return next(new ErrorHandler("Order Already Delivered", 400));
  
    await order.save();
  
    res.status(200).json({
      success: true,
      message: "Order Processed Successfully",
    });
  });