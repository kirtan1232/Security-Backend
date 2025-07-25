const crypto = require("crypto");
const { v4 } = require("uuid");

exports.createDonationOrder = async (req, res, next) => {
  const { amount } = req.body;
  const transactionUuid = v4();

  const signature = this.createSignature(
    `total_amount=${amount},transaction_uuid=${transactionUuid},product_code=EPAYTEST`
  );

  const formData = {
    amount: amount,
    failure_url: `https://localhost:3000/api/esewa/failure`,
    product_delivery_charge: "0",
    product_service_charge: "0",
    product_code: "EPAYTEST",
    signature: signature,
    signed_field_names: "total_amount,transaction_uuid,product_code",
    success_url: `https://localhost:3000/api/esewa/success`,
    tax_amount: "0",
    total_amount: amount,
    transaction_uuid: transactionUuid,
  };

  res.json({
    message: "Donation Order Created Successfully",
    formData,
    payment_method: "esewa",
  });
};

exports.verifyPayment = async (req, res) => {
    try {
      const { data, redirect } = req.query;
      const decodedData = JSON.parse(Buffer.from(data, "base64").toString("utf-8"));
      
      if (decodedData.status === "COMPLETE") {
        return res.redirect(redirect || `https://localhost:5173/success?payment=success`);
      }
      return res.redirect(`https://localhost:5173/dashboard?payment=failure`);
    } catch (err) {
      console.error("Payment verification error:", err);
      return res.redirect(`https://localhost:5173/dashboard?payment=error`);
    }
  };

exports.handleFailure = async (req, res) => {
    const { redirect } = req.query;
    return res.redirect(redirect || `https://localhost:5173/dashboard?payment=failure`);
};

exports.createSignature = (message) => {
  const secret = "8gBm/:&EnhH.1/q";
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(message);
  return hmac.digest("base64");
};