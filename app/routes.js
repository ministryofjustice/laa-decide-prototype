//
// For guidance on how to create routes see:
// https://prototype-kit.service.gov.uk/docs/create-routes
//
const express = require('express');
const govukPrototypeKit = require('govuk-prototype-kit')
const router = govukPrototypeKit.requests.setupRouter()

// Add your routes here
const static = require('./routes/static.js');
const latest = require('./routes/latest.js');
const v2 = require('./routes/v2.js');
const v3 = require('./routes/v3.js');
const v4 = require('./routes/v4.js');

// Call in routes file from routes folder to keep routes.js cleaner
router.use('/v2', v2);
router.use('/v3', v3);
router.use('/v4', v4);
router.use('/latest', latest);
router.use('/static', static);

router.use('/node_modules', express.static('node_modules'));
