const admin = require("firebase-admin");

const dateToTimestamp = (date) => {
  return admin.firestore.Timestamp.fromDate(date);
};

const timestampToDate = (timestamp) => {
  return timestamp.toDate();
};

module.exports = { dateToTimestamp, timestampToDate };
