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

  // update substantive proceeding merits results
  for (const proceeding of application['applicationDetails']['proceedings']){
    if (typeof req.session.data[proceeding['id']] !== 'undefined' && req.session.data[proceeding['id']] !== null){
      for (const certificate of proceeding['certificates']){
        if (certificate['certificateType'] == 'Substantive certificate'){
          certificate['meritsResult'] = req.session.data[proceeding['id']]
        }
      }
    }
  }

  // update overall merits results
  // count the numner of granted and refused proceedings
  var grants = 0;
  var refuses = 0;
  var total_proceedings = 0;

  for (const proceeding of application['applicationDetails']['proceedings']){
    for (const certificate of proceeding['certificates']){
      if (certificate['meritsResult'] == 'grant'){
        grants = grants + 1;
      }
      if (certificate['meritsResult'] == 'refuse'){
        refuses = refuses + 1;
      }
      total_proceedings = total_proceedings + 1;
    }

    // if any proceedings have been refused, the application is refused
    if (refuses > 0){
      application['applicationDetails']['meritsAssessmentResult'] = 'refuse'
    }

    // if all proceedings have been granted, the application is granted
    if (grants === total_proceedings){
      application['applicationDetails']['meritsAssessmentResult'] = 'grant'
    }
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

  // update emergency proceeding merits results
  for (const proceeding of application['applicationDetails']['proceedings']){
    if (typeof req.session.data[proceeding['id']] !== 'undefined' && req.session.data[proceeding['id']] !== null){
      for (const certificate of proceeding['certificates']){
        if (certificate['certificateType'] == 'Emergency certificate'){
          certificate['meritsResult'] = req.session.data[proceeding['id']]
        }
      }
    }
  }

  // update  overall merits assessment result
  application['applicationDetails']['meritsAssessmentResult'] = 'in progress'

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
