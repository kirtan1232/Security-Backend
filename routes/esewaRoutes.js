const express = require("express");
const {
  createDonationOrder,
  verifyPayment,
    handleFailure,
} = require("../controller/esewaController");
const router = express.Router();

router.post("/donate", createDonationOrder);
router.get("/success", verifyPayment);
router.get("/failure", handleFailure);

module.exports = router;