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

  // Create the order in the database
  const order = await Order.create({
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

  // Update product stock
  for (let i = 0; i < orderItems.length; i++) {
    const product = await Product.findById(orderItems[i].product);
    product.stock -= orderItems[i].quantity;
    await product.save();
  }

  // Constructing email text with order details
  const subject = "Myrmidons Clothing";
  const to = req.user.email;
  const orderId = order._id.toString(); // Convert ObjectId to string

  // Constructing order details text
  const orderDetailsText = `
    Order ID: ${orderId}
    Shipping Information:
    Address: ${shippingInfo.address}<br/>
    City: ${shippingInfo.city}<br/>
    Country: ${shippingInfo.country}<br/>
    Pin Code: ${shippingInfo.pinCode}<br/>

    Order Items:
      ${orderItems
        .map((item) => `${item.name} - Quantity: ${item.quantity}`)
        .join("\n")}
    
    Payment Method: ${paymentMethod}
    Payment Information: ${paymentInfo}
    Items Price: ${itemsPrice}
    Tax Price: ${taxPrice}
    Shipping Charges: ${shippingCharges}
    Total Amount: ${totalAmount}
  `;

  // Constructing HTML content for the email
  const orderDetailsHTML = `
  <h1>Thank you for choosing Myrmidons Clothing!</h1>
  <h2>Here are the details of your order:</h2>
    <p><strong>Order ID:</strong> ${orderId}</p>
    <p><strong>Shipping Information:</strong><br/>
      Address: ${shippingInfo.address}<br/>
      City: ${shippingInfo.city}<br/>
      Country: ${shippingInfo.country}<br/>
      Pin Code: ${shippingInfo.pinCode}<br/>
    </p>
    <p><strong>Order Items:</strong><br/>
      ${orderItems
        .map((item) => `${item.name} - Quantity: ${item.quantity}`)
        .join("<br/>")}
    </p>
    <p><strong>Payment Information:</strong><br/>Payment Method: ${paymentMethod}<br/>Items Price: ${itemsPrice}<br/>Tax Price: ${taxPrice}<br/>Shipping Charges: ${shippingCharges}<br/>Total Amount: ${totalAmount}</p>
  `;

  // Send the email
  await sendEmail(subject, to, orderDetailsText, orderDetailsHTML);

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

const sendTransactionCompleteEmail = async (userEmail, orderId) => {
  try {
    // Find the order by ID and populate its items
    const order = await Order.findById(orderId).populate("orderItems.product");

    if (!order) {
      console.error(`Order not found for ID: ${orderId}`);
      return;
    }

    // Create a PDF document
    const pdfDoc = new PDFDocument();
    const pdfPath = "order_confirmation.pdf";
    pdfDoc.pipe(fs.createWriteStream(pdfPath));
    pdfDoc
      .font("Helvetica-Bold")
      .fontSize(18)
      .text("Order Details", { align: "center" });
    pdfDoc.moveDown(0.5);
    pdfDoc.text(`Order ID: ${order._id}`);

    // Loop through order items and add to PDF
    order.orderItems.forEach((item, index) => {
      pdfDoc.text(`  Item ${index + 1}`);
      pdfDoc.text(`    Name: ${item.product.name}`);
      pdfDoc.text(`    Quantity: ${item.quantity}`);
      pdfDoc.text(`    Price: ${item.price}`);
    });

    pdfDoc.text(`Total Price: ${order.totalAmount}`);
    pdfDoc.text(`Paid At: ${order.createdAt}`);
    pdfDoc.end();
    // Constructing email text with shipping information
    // const subject = "Order Confirmation";
    // const to = req.user.email;
    // const text = `Thank you for your order!\n\nOrder Details:\n\nOrder ID: \n\nShipping Information:\n${JSON.stringify(shippingInfo, null, 2)}\n`;
    // await sendEmail(subject, to, text);
    // Send email with order details and attachment
    await sendEmail({
      to: req.user.email,
      subject: "Myrmidons Clothing - Order Confirmation",
      text: `<h1>Order Confirmed!</h1>
        <h3>Order #${order._id}</h3>
        <p>We're pleased to inform you that your order has been confirmed and is currently being processed.</p>
        <br/>
        <p>Thank you for choosing Myrmidons Clothing. We appreciate your business and look forward to providing you with a seamless experience.</p>
        <br/>
        <p>Best Regards,</p>
        <p>Myrmidons Clothing</p>`,
    });

    console.log(`Order confirmation email sent to: ${userEmail}`);
  } catch (error) {
    console.error(`Error sending order confirmation email: ${error.message}`);
  }
};

export const dailySales = asyncError(async (req, res, next) => {
  try {
    const salesPerDay = await Order.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          totalSales: { $sum: "$totalAmount" },
        },
      },
      { $sort: { _id: 1 } }, // Sort by date in ascending order
    ]);

    res.status(200).json({
      success: true,
      salesPerDay,
    });
  } catch (error) {
    next(new ErrorHandler("Failed to fetch daily sales", 500));
  }
});

export const geographicSales = asyncError(async (req, res, next) => {
  try {
    const salesByCity = await Order.aggregate([
      {
        $group: {
          _id: "$shippingInfo.city",
          totalSales: { $sum: "$totalAmount" },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      salesByCity,
    });
  } catch (error) {
    next(new ErrorHandler("Failed to fetch geographic sales", 500));
  }
});