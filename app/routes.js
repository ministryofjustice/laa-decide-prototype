const express = require('express');
const router = express.Router();
const v2 = require('./routes/v2.js');
const v3 = require('./routes/v3.js');
const v4 = require('./routes/v4.js');

// Call in routes file from routes folder to keep routes.js cleaner
router.use('/v2', v2);
router.use('/v3', v3);
router.use('/v4', v4);

router.use('/node_modules', express.static('node_modules'));

module.exports = router
