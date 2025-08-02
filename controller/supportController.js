const Support = require("../model/supportModel");


exports.createSupportRecord = async (req, res) => {
  try {
    const { amount, nameOrSocial, message } = req.body;

    if (!amount || !nameOrSocial) {
      return res.status(400).json({ 
        message: "Amount and name/social handle are required",
        receivedData: req.body
      });
    }

   
    const existingRecord = await Support.findOne({
      amount: Number(amount),
      nameOrSocial: String(nameOrSocial).trim(),
      createdAt: { $gt: new Date(Date.now() - 5 * 60 * 1000) } 
    });

    if (existingRecord) {
      return res.status(200).json({
        message: "Support record already exists",
        supportRecord: existingRecord
      });
    }

    const supportRecord = new Support({
      amount: Number(amount),
      nameOrSocial: String(nameOrSocial).trim(),
      message: message ? String(message).trim() : "",
    });

    await supportRecord.save();
    res.status(201).json({ 
      message: "Support record created successfully",
      supportRecord 
    });
  } catch (error) {
    console.error("Full error:", error);
    res.status(500).json({ 
      message: "Failed to create support record",
      error: error.message 
    });
  }
};

exports.getSupportRecords = async (req, res) => {
  try {
    const supportRecords = await Support.find().sort({ createdAt: -1 });
    res.status(200).json({ message: "Support records fetched successfully", supportRecords });
  } catch (error) {
    console.error("Error fetching support records:", error);
    res.status(500).json({ message: "Failed to fetch support records" });
  }
};
  