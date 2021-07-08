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
  var refusals = 0;
  var total_proceedings = 0;

  for (const proceeding of application['applicationDetails']['proceedings']){
    for (const certificate of proceeding['certificates']){
      if (certificate['meritsResult'] == 'granted'){
        grants = grants + 1;
      }
      if (certificate['meritsResult'] == 'refused'){
        refusals = refusals + 1;
      }
      total_proceedings = total_proceedings + 1;
    }
  }

  // if all proceedings have been refused, the application is refused
  if (refusals === total_proceedings){
    application['applicationDetails']['meritsAssessmentResult'] = 'refused'
  }

  // if all proceedings have been granted, the application is granted
  if (grants === total_proceedings){
    application['applicationDetails']['meritsAssessmentResult'] = 'granted'
  }

  // if some proceedings have been refused, the application is partially granted
  if ((refusals > 0) && (grants > 0) && (refusals + grants == total_proceedings)){
    application['applicationDetails']['meritsAssessmentResult'] = 'partially granted'
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

router.get('/v2/merits-assessment-substantive', function(req, res) {
  if (req.session.data.update_all_emergency === 'Refuse all'){
    res.render('./v2/refuse-application');
  }
  else if (req.session.data.update_all_emergency === 'Grant all'){
    var application = null;

    // find the application
    for (const app of req.session.data.applications) {
      if (app.applicationDetails.refNo === req.session.data.refNo)
        application = app;
    }

    // grant all emergency proceeding merits results
    for (const proceeding of application['applicationDetails']['proceedings']){
      for (const certificate of proceeding['certificates']){
        if (certificate['certificateType'] == 'Emergency certificate'){
          certificate['meritsResult'] = 'granted';
        }
      }
    }

    application['applicationDetails']['meritsAssessmentResult'] = 'in progress'
    res.locals.data['application'] = application;
    res.render('./v2/merits-assessment-substantive');
  }
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

  // update overall merits assessment result
  application['applicationDetails']['meritsAssessmentResult'] = 'in progress'

  res.locals.data['application'] = application;

  // direct to correct page based on button clicked
  if (req.session.data['continue_button'] == "Save and come back later"){
    res.render('./v2/case-details');
  }
  else {
    res.render('./v2/merits-assessment-substantive');
  }
});

router.post('/v2/refuse-application', function(req, res) {
  var application = null;

  // find the application
  for (const app of req.session.data.applications) {
    if (app.applicationDetails.refNo === req.session.data.refNo)
      application = app;
  }

  if (req.session.data['update_all_substantive'] === "Refuse all") {

    // refuse all substantive proceeding merits results
    for (const proceeding of application['applicationDetails']['proceedings']){
      for (const certificate of proceeding['certificates']){
        if (certificate['certificateType'] == 'Substantive certificate'){
          certificate['meritsResult'] = 'refused';
        }
      }
    }

    application['applicationDetails']['meritsAssessmentResult'] = 'in progress'
    res.locals.data['application'] = application;
    res.redirect('./case-details');
  }
  else if (req.session.data['update_all_emergency'] === "Refuse all"){

    // refuse all emergency proceeding merits results
    for (const proceeding of application['applicationDetails']['proceedings']){
      for (const certificate of proceeding['certificates']){
        if (certificate['certificateType'] == 'Emergency certificate'){
          certificate['meritsResult'] = 'refused';
        }
      }
    }

    application['applicationDetails']['meritsAssessmentResult'] = 'in progress'
    res.locals.data['application'] = application;
    res.redirect(307, './merits-assessment-substantive');
  }
});

router.get('/v2/substantive-update-all', function(req, res) {
  if (req.session.data.update_all_substantive === 'Refuse all'){
    res.render('./v2/refuse-application');
  }
  else if (req.session.data.update_all_substantive === 'Grant all'){
    var application = null;

    // find the application
    for (const app of req.session.data.applications) {
      if (app.applicationDetails.refNo === req.session.data.refNo)
        application = app;
    }

    // grant all substantive proceeding merits results
    for (const proceeding of application['applicationDetails']['proceedings']){
      for (const certificate of proceeding['certificates']){
        if (certificate['certificateType'] == 'Substantive certificate'){
          certificate['meritsResult'] = 'granted';
        }
      }
    }
    res.locals.data['application'] = application;
    res.redirect(307, './case-details');
  }
});

router.post('/v2/reject-application', function(req, res) {
  var application = null;

  // find the application
  for (const app of req.session.data.applications) {
    if (app.applicationDetails.refNo === req.session.data.refNo)
      application = app;
  }

  application['applicationDetails']['meritsAssessmentResult'] = 'rejected'
  application['applicationDetails']['meansAssessmentResult'] = 'rejected'

  res.redirect('./case-details');
});

module.exports = router
