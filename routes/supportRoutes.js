const express = require("express");
const { createSupportRecord, getSupportRecords } = require("../controller/supportController");
const router = express.Router();

router.post("/",  createSupportRecord);
router.get("/",  getSupportRecords);

module.exports = router;