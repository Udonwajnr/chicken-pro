const express    = require('express');
const router     = express.Router();
const { protect } = require('../middleware/auth');
const {
  getMessages, sendMessage, getUnreadCount,
} = require('../controllers/chatController');

router.get('/unread',              protect, getUnreadCount);
router.get('/:orderId',            protect, getMessages);
router.post('/',                   protect, sendMessage);

module.exports = router;