const express = require('express')
const router = express.Router()

router.get('/v2/my-applications', function(req, res) {
  var refNo = req.session.data.refNo;

  if (!req.session.data.assignedApplications.includes(refNo))
    req.session.data.assignedApplications.push(refNo);

  res.render('./v2/my-applications');
});

router.get('/v2/case-details', function(req, res) {
  var application = null;

  for (const app of req.session.data.applications) {
    if (app.applicationDetails.refNo === req.session.data.refNo)
      application = app;
  }

  res.locals.data['application'] = application;
  res.render('./v2/case-details');
});

module.exports = router
