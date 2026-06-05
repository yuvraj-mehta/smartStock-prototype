import express from "express";

const router = express.Router();

const deprecatedFulfillmentOrderRoute = (req, res) => {
  res.status(410).json({
    message: "The fulfillment-order workflow has been retired. Use /api/v1/order, /api/v1/package, /api/v1/transport, and /api/v1/return.",
    replacementRoutes: [
      "/api/v1/order",
      "/api/v1/package",
      "/api/v1/transport",
      "/api/v1/return",
    ],
  });
};

router.use(deprecatedFulfillmentOrderRoute);

export default router;
