const Order = require('../../Models/orderModel')
const moment = require('moment')
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

const sales = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const { filterSales, startDate, endDate } = req.query;

    const matchStage = createMatchStage(filterSales, startDate, endDate);
    const salesAggregate = createSalesAggregate(matchStage);

    const salesData = await Order.aggregate(salesAggregate);

    const orders = await Order.aggregate([
      { $match: matchStage },
      {
        $addFields: {
          products: {
            $filter: {
              input: "$products",
              as: "product",
              cond: {
                $in: ["$$product.status", ["Delivered", "Return Requested"]],
              },
            },
          },
        },
      },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: parseInt(limit) },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $lookup: {
          from: "products",
          localField: "products.product",
          foreignField: "_id",
          as: "populatedProducts",
        },
      },
      {
        $addFields: {
          products: {
            $map: {
              input: "$products",
              as: "product",
              in: {
                $mergeObjects: [
                  "$$product",
                  {
                    product: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: "$populatedProducts",
                            cond: { $eq: ["$$this._id", "$$product.product"] },
                          },
                        },
                        0,
                      ],
                    },
                  },
                ],
              },
            },
          },
        },
      },
      { $project: { populatedProducts: 0 } },
    ]);

    const totalOrders = await Order.countDocuments(matchStage);

    res.render("sales", {
      salesData: salesData[0] || {
        totalSalesCount: 0,
        totalProductCount: 0,
        totalOriginalSum: 0,
        totalDiscountedSum: 0,
        totalDiscount: 0,
        totalSales: 0,
      },
      orders,
      page,
      limit,
      totalOrders,
      totalPages: Math.ceil(totalOrders / limit),
      filterSales,
      startDate,
      endDate,
      query: req.query,
    });
  } catch (error) {
    console.error("Error fetching sales data:", error);
    res.status(500).send("An error occurred while fetching sales data");
  }
};

const generatePdf = async (req, res) => {
  try {
    const { filterSales, startDate, endDate } = req.query;
    const matchStage = createMatchStage(filterSales, startDate, endDate);
    const salesAggregate = createSalesAggregate(matchStage);
    const salesData = await Order.aggregate(salesAggregate);
    const salesSummary = salesData[0] || {
      totalSalesCount: 0,
      totalProductCount: 0,
      totalOriginalSum: 0,
      totalDiscountedSum: 0,
      totalDiscount: 0,
      totalSales: 0,
    };

    const orders = await Order.aggregate([
      { $match: matchStage },
      {
        $addFields: {
          products: {
            $filter: {
              input: "$products",
              as: "product",
              cond: {
                $in: ["$$product.status", ["Delivered", "Return Requested"]],
              },
            },
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $lookup: {
          from: "products",
          localField: "products.product",
          foreignField: "_id",
          as: "populatedProducts",
        },
      },
      {
        $addFields: {
          products: {
            $map: {
              input: "$products",
              as: "product",
              in: {
                $mergeObjects: [
                  "$$product",
                  {
                    product: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: "$populatedProducts",
                            cond: { $eq: ["$$this._id", "$$product.product"] },
                          },
                        },
                        0,
                      ],
                    },
                  },
                ],
              },
            },
          },
        },
      },
      { $project: { populatedProducts: 0 } },
    ]);

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader(
      "Content-disposition",
      'attachment; filename="sales_report.pdf"'
    );
    res.setHeader("Content-type", "application/pdf");
    doc.pipe(res);

    doc.fontSize(18).text("Sales Report", { align: "center" });
    doc.moveDown();

    doc.fontSize(12).text(`Filter: ${filterSales}`);
    if (filterSales === "custom" && startDate && endDate) {
      doc.text(`Date Range: ${startDate} to ${endDate}`);
    }
    doc.moveDown();

    doc.fontSize(14).text("Summary");
    doc.fontSize(12).text(`Total Sales: ${salesSummary.totalSalesCount}`);
    doc.text(
      `Total Original Sum: Rs.${salesSummary.totalOriginalSum.toFixed(2)}`
    );
    doc.text(`Total Discount: Rs.${salesSummary.totalDiscount.toFixed(2)}`);
    doc.text(`Total Revenue: Rs.${salesSummary.totalDiscountedSum.toFixed(2)}`);
    doc.moveDown();

    doc.fontSize(14).text("Order Details");
    doc.moveDown();

    const table = {
      headers: ["Order ID", "Date", "Products", "Price", "Discount", "Total"],
      rows: [],
    };

    orders.forEach((order) => {
      const products = order.products
        .map((p) => `${p.product.name} (${p.quantity})`)
        .join(", ");
      const originalPrice = order.products.reduce(
        (sum, p) => sum + p.originalPrice,
        0
      );
      const totalPrice = order.products.reduce(
        (sum, p) => sum + p.totalPrice,
        0
      );
      const discount = order.products.reduce((sum, p) => {
        return sum + (p.discountedPrice - p.originalPrice);
      }, 0);

      table.rows.push([
        order.orderId.toString(),
        moment(order.createdAt).format("YYYY-MM-DD"),
        products,

        `Rs.${originalPrice.toFixed(2)}`,
        `Rs.${discount.toFixed(2)}`,
        `Rs.${totalPrice.toFixed(2)}`,
      ]);
    });

    drawTable(doc, table);

    doc.end();
  } catch (error) {
    console.error("Error generating PDF:", error);
    res.status(500).send("An error occurred while generating the PDF");
  }
};

function drawTable(doc, table) {
  const startX = 50;
  const startY = doc.y + 10;
  const cellPadding = 5;
  const cellWidth = (doc.page.width - 100) / table.headers.length;
  const cellHeight = 20;
  let currentY = startY;

  doc.font("Helvetica-Bold");
  table.headers.forEach((header, i) => {
    doc.rect(startX + cellWidth * i, currentY, cellWidth, cellHeight).stroke();
    doc.text(
      header,
      startX + cellWidth * i + cellPadding,
      currentY + cellPadding,
      {
        width: cellWidth - cellPadding * 2,
        align: "left",
      }
    );
  });
  currentY += cellHeight;

  
  doc.font("Helvetica");
  table.rows.forEach((row) => {
    const rowHeight =
      Math.max(
        ...row.map((cell) =>
          doc.heightOfString(cell, { width: cellWidth - cellPadding * 2 })
        )
      ) +
      cellPadding * 2;

    if (currentY + rowHeight > doc.page.height - 50) {
      doc.addPage();
      currentY = 50;
    }

    row.forEach((cell, i) => {
      doc.rect(startX + cellWidth * i, currentY, cellWidth, rowHeight).stroke();
      doc.text(
        cell,
        startX + cellWidth * i + cellPadding,
        currentY + cellPadding,
        {
          width: cellWidth - cellPadding * 2,
          align: "left",
        }
      );
    });
    currentY += rowHeight;
  });
}

const generateExcel = async (req, res) => {
  try {
    const { filterSales, startDate, endDate } = req.query;
    const matchStage = createMatchStage(filterSales, startDate, endDate);
    const salesAggregate = createSalesAggregate(matchStage);
    const salesData = await Order.aggregate(salesAggregate);
    const salesSummary = salesData[0] || {
      totalSalesCount: 0,
      totalProductCount: 0,
      totalOriginalSum: 0,
      totalDiscountedSum: 0,
      totalDiscount: 0,
      totalSales: 0,
    };

    const orders = await Order.aggregate([
      { $match: matchStage },
      {
        $addFields: {
          products: {
            $filter: {
              input: "$products",
              as: "product",
              cond: {
                $in: ["$$product.status", ["Delivered", "Return Requested"]],
              },
            },
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $lookup: {
          from: "products",
          localField: "products.product",
          foreignField: "_id",
          as: "populatedProducts",
        },
      },
      {
        $addFields: {
          products: {
            $map: {
              input: "$products",
              as: "product",
              in: {
                $mergeObjects: [
                  "$$product",
                  {
                    product: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: "$populatedProducts",
                            cond: { $eq: ["$$this._id", "$$product.product"] },
                          },
                        },
                        0,
                      ],
                    },
                  },
                ],
              },
            },
          },
        },
      },
      { $project: { populatedProducts: 0 } },
    ]);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Sales Report");

    worksheet.mergeCells("A1:F1");
    worksheet.getCell("A1").value = "Sales Report";
    worksheet.getCell("A1").font = { size: 16, bold: true };
    worksheet.getCell("A1").alignment = { horizontal: "center" };
    worksheet.getCell("A3").value = `Filter: ${filterSales}`;
    if (filterSales === "custom" && startDate && endDate) {
      worksheet.getCell("A4").value = `Date Range: ${startDate} to ${endDate}`;
    }

    const headers = [
      "Order ID",
      "Date",
      "Price",
      "Total",
      "Discount",
      "Products",
    ];
    worksheet.addRow(headers);

    const headerRow = worksheet.getRow(6);
    headerRow.font = { bold: true };
    headerRow.alignment = { horizontal: "center" };

    orders.forEach((order) => {
      const products = order.products
        .map((p) => `${p.product.name} (${p.quantity})`)
        .join(", ");
      const originalPrice = order.products.reduce(
        (sum, p) => sum + p.originalPrice,
        0
      );
      const totalPrice = order.products.reduce(
        (sum, p) => sum + p.totalPrice,
        0
      );
      const discount = order.products.reduce((sum, p) => {
        return sum + (p.discountedPrice - p.originalPrice);
      }, 0);

      worksheet.addRow([
        order.orderId.toString(),
        moment(order.createdAt).format("YYYY-MM-DD"),
        `Rs.${originalPrice.toFixed(2)}`,
        `Rs.${discount.toFixed(2)}`,
        `Rs.${totalPrice.toFixed(2)}`,
        products,
      ]);
    });

    const summaryStartRow = worksheet.rowCount + 2;
    worksheet.getCell(`A${summaryStartRow}`).value = "Summary";
    worksheet.getCell(`A${summaryStartRow}`).font = { size: 14, bold: true };
    worksheet.getCell(
      `A${summaryStartRow + 1}`
    ).value = `Total Sales: ${salesSummary.totalSalesCount}`;
    worksheet.getCell(
      `A${summaryStartRow + 2}`
    ).value = `Total Original Sum: Rs.${salesSummary.totalOriginalSum.toFixed(
      2
    )}`;
    worksheet.getCell(
      `A${summaryStartRow + 3}`
    ).value = `Total Discount: Rs.${salesSummary.totalDiscount.toFixed(2)}`;
    worksheet.getCell(
      `A${summaryStartRow + 4}`
    ).value = `Total Revenue: Rs.${salesSummary.totalDiscountedSum.toFixed(2)}`;

    worksheet.columns.forEach((column) => {
      column.width = Math.max(
        12,
        ...column.values.map((v) => (v ? v.toString().length : 0))
      );
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=sales_report.xlsx"
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error generating Excel:", error);
    res.status(500).send("An error occurred while generating the Excel file");
  }
};


const generateInvoice = async (req, res) => {
  try {
    const orderId = req.params.orderId;

    const order = await Order.findById(orderId)
      .populate("user")
      .populate("products.product");
    if (!order) {
      return res.status(404).json("Order not found");
    }

    const doc = new PDFDocument({ margin: 50 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=invoice-${order.orderId}.pdf`
    );

    doc.pipe(res);

    doc.fontSize(20).text("TAARA", 50, 50);
    doc.fontSize(10).text("3rd Floor KINFRA INFOPARK", 50, 80);
    doc.text("NH66 CALICUT UNIVERSITY", 50, 95);
    doc.text("MALAPPURAM, KERALA 673634", 50, 110);
    doc.text("+91 (99) 999 9999, +91 (88) 888 8888", 50, 125);

    doc.fontSize(16).text(`Invoice #${order.orderId}`, 400, 50);
    doc
      .fontSize(10)
      .text(
        `Date Issued: ${moment(order.createdAt).format("MMMM D, YYYY")}`,
        400,
        70
      );
    doc.text(
      `Date Due: ${moment(order.createdAt)
        .add(30, "days")
        .format("MMMM D, YYYY")}`,
      400,
      85
    );

    doc.text("Invoice To:", 50, 150);
    // doc.text(order.user.firstName || 'N/A', 50, 170);
    doc.text(order.address.name, 50, 170);
    doc.text(`${order.address.address}, ${order.address.street}`, 50, 185);
    doc.text(
      `${order.address.city}, ${order.address.state} - ${order.address.pincode}`,
      50,
      200
    );
    doc.text(order.address.phone.toString(), 50, 215);

    const tableTop = 280;
    const itemCol = 50;
    const quantityCol = 200;
    const priceCol = 280;
    const discountCol = 360;
    const totalCol = 460;

    doc.font("Helvetica-Bold");
    doc.text("Item", itemCol, tableTop);
    doc.text("Quantity", quantityCol, tableTop);
    doc.text("Price", priceCol, tableTop);
    doc.text("Discount", discountCol, tableTop);
    doc.text("Total", totalCol, tableTop);

    doc
      .moveTo(50, tableTop + 15)
      .lineTo(550, tableTop + 15)
      .stroke();

    doc.font("Helvetica");
    let tableRowTop = tableTop + 20;

    order.products.forEach((item) => {
      doc.text(item.name, itemCol, tableRowTop);
      doc.text(item.quantity.toString(), quantityCol, tableRowTop);
      doc.text(`Rs.${item.originalPrice.toFixed(2)}`, priceCol, tableRowTop);
      doc.text(
        `Rs.${(item.originalPrice - item.discountedPrice).toFixed(2)}`,
        discountCol,
        tableRowTop
      );
      doc.text(`Rs.${item.totalPrice.toFixed(2)}`, totalCol, tableRowTop);

      doc
        .moveTo(50, tableRowTop + 15)
        .lineTo(550, tableRowTop + 15)
        .stroke();

      tableRowTop += 20;
    });

    doc.text("Subtotal:", discountCol, tableRowTop + 20);
    doc.text(
      `Rs.${order.originalSubTotal.toFixed(2)}`,
      totalCol,
      tableRowTop + 20
    );
    doc.text("Discount:", discountCol, tableRowTop + 40);
    doc.text(
      `Rs.${(order.originalSubTotal - order.discountedSubTotal).toFixed(2)}`,
      totalCol,
      tableRowTop + 40
    );
    doc.text("Shipping:", discountCol, tableRowTop + 60);
    doc.text(
      `Rs.${order.shippingCharge.toFixed(2)}`,
      totalCol,
      tableRowTop + 60
    );
    doc.font("Helvetica-Bold");
    doc.text("Total:", discountCol, tableRowTop + 80);
    doc.text(`Rs.${order.finalTotal.toFixed(2)}`, totalCol, tableRowTop + 80);

    doc.font("Helvetica");
    doc.text("Note:", itemCol, tableRowTop + 120);
    doc.text("Thank you for shopping with us!", itemCol, tableRowTop + 140);
    doc.end();
  } catch (error) {
    console.error("Error generating invoice:", error.message);
    res
      .status(500)
      .json({ success: false, message: "Error generating invoice" });
  }
};


const createMatchStage = (filterSales, startDate, endDate) => {
  const currentDate = moment().startOf("day");
  let matchStage = {
    "products.status": { $in: ["Delivered", "Return Requested"] },
  };

  switch (filterSales) {
    case "daily":
      matchStage.createdAt = {
        $gte: currentDate.toDate(),
        $lt: moment(currentDate).endOf("day").toDate(),
      };
      break;
    case "weekly":
      matchStage.createdAt = {
        $gte: moment(currentDate).subtract(7, "days").toDate(),
        $lt: moment(currentDate).endOf("day").toDate(),
      };
      break;
    case "monthly":
      matchStage.createdAt = {
        $gte: moment(currentDate).subtract(1, "month").toDate(),
        $lt: moment(currentDate).endOf("day").toDate(),
      };
      break;
    case "yearly":
      matchStage.createdAt = {
        $gte: moment(currentDate).subtract(1, "year").toDate(),
        $lt: moment(currentDate).endOf("day").toDate(),
      };
      break;
    case "custom":
      if (startDate && endDate) {
        matchStage.createdAt = {
          $gte: moment(startDate).startOf("day").toDate(),
          $lt: moment(endDate).endOf("day").toDate(),
        };
      }
      break;
    default:
      break;
  }

  return matchStage;
};

const createSalesAggregate = (matchStage) => [
  { $match: matchStage },
  {
    $addFields: {
      filteredProducts: {
        $filter: {
          input: "$products",
          as: "product",
          cond: {
            $in: ["$$product.status", ["Delivered", "Return Requested"]],
          },
        },
      },
    },
  },
  { $unwind: "$filteredProducts" },
  {
    $group: {
      _id: null,
      totalSalesCount: { $sum: 1 },
      totalProductCount: { $sum: 1 },
      totalOriginalSum: { $sum: "$filteredProducts.originalPrice" },
      totalDiscountedSum: { $sum: "$filteredProducts.discountedPrice" },
      totalPriceSum: { $sum: "$filteredProducts.totalPrice" },
      totalQuantity: { $sum: "$filteredProducts.quantity" },
    },
  },
  {
    $project: {
      _id: 0,
      totalSalesCount: 1,
      totalProductCount: 1,
      totalOriginalSum: 1,
      totalDiscountedSum: 1,
      totalPriceSum: 1,
      totalQuantity: 1,
      totalDiscount: {
        $subtract: ["$totalOriginalSum", "$totalDiscountedSum"],
      },
    },
  },
];


module.exports = {
  sales,
  generatePdf,
  generateExcel,
  generateInvoice,
};
