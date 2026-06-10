const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");

const {
  createFarm,
  getMyFarm,
  updateFarm,
  profitPreview,
  getLivestockTypes,
} = require("../controllers/farmController");

router.post("/", protect, createFarm);
router.get("/me", protect, getMyFarm);
router.put("/me", protect, updateFarm);
router.get("/profit-preview", protect, profitPreview);
router.get("/livestock-types", protect, getLivestockTypes);

module.exports = router;
