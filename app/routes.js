//
// For guidance on how to create routes see:
// https://prototype-kit.service.gov.uk/docs/create-routes
//
const express = require('express');
const govukPrototypeKit = require('govuk-prototype-kit')
const router = govukPrototypeKit.requests.setupRouter()

// Version 3 is the active target for all future work.
// Older versions are intentionally frozen and left read-only.
router.get('/', function(req, res) {
  res.redirect('/v6-v3/');
});

// Add your routes here
const static = require('./routes/static.js');
const latest = require('./routes/latest.js');
const v2 = require('./routes/v2.js');
const v3 = require('./routes/v3.js');
const v4 = require('./routes/v4.js');
const v5 = require('./routes/v5.js');
const v6 = require('./routes/v6.js');
const v6v2 = require('./routes/v6-v2.js');
const v6v3 = require('./routes/v6-v3.js');

// Call in routes file from routes folder to keep routes.js cleaner
router.use('/v2', v2);
router.use('/v3', v3);
router.use('/v4', v4);
router.use('/v5', v5);
router.use('/v6', v6);
router.use('/v6-v2', v6v2);
router.use('/v6-v3', v6v3);
router.use('/latest', latest);
router.use('/static', static);

router.use('/node_modules', express.static('node_modules'));
