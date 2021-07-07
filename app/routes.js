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

  // find the application
  for (const app of req.session.data.applications) {
    if (app.applicationDetails.refNo === req.session.data.refNo)
      application = app;
  }

  res.locals.data['application'] = application;
  res.render('./v2/case-details');
});

router.get('/v2/merits-assessment-emergency', function(req, res) {
  var application = null;

  // find the application
  for (const app of req.session.data.applications) {
    if (app.applicationDetails.refNo === req.session.data.refNo)
      application = app;
  }

  res.locals.data['application'] = application;
  res.render('./v2/merits-assessment-emergency');
});

router.post('/v2/merits-assessment-substantive', function(req, res) {
  var application = null;

  // find the application
  for (const app of req.session.data.applications) {
    if (app.applicationDetails.refNo === req.session.data.refNo)
      application = app;
  }

  // update proceeding results
  for (const proceeding of application['applicationDetails']['proceedings']){
    if (typeof req.session.data[proceeding['id']] !== 'undefined' && req.session.data[proceeding['id']] !== null){
      for (const certificate of proceeding['certificates']){
        if (certificate['certificateType'] == 'Emergency certificate'){
          certificate['meritsResult'] = req.session.data[proceeding['id']]
        }
      }
    }
  }

  res.locals.data['application'] = application;

  // direct to correct page based on button clicked
  if (req.session.data['continue_button'] == "Save and continue"){
    res.render('./v2/merits-assessment-substantive');
  }
  else {
    res.render('./v2/case-details');
  }

});

module.exports = router
