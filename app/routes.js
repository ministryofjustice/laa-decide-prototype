const express = require('express')
const router = express.Router()

router.get('/v2/my-applications', function(req, res) {
  var refNo = req.session.data.refNo;
  var refNoToRemove = req.session.data.refNoToRemove;

  // if a refNo exists then we are assigning an application
  if (refNo != null){
    if (!req.session.data.assignedApplications.includes(refNo)){
      req.session.data.assignedApplications.push(refNo);
    }
  }

  // if a refNoToRemove exists then we are unassigning an application
  if (refNoToRemove != null){
    const index = req.session.data.assignedApplications.indexOf(refNoToRemove);
    if (index > -1) {
      req.session.data.assignedApplications.splice(index, 1);
    }
  }

  req.session.data.refNo = null;
  req.session.data.refNoToRemove = null;

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
