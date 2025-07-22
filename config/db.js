const mongoose = require("mongoose");

const connectDb = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB Connected");
    } catch (e) {
        console.log("MongoDB not connected", e);
    }
};

module.exports = connectDb;