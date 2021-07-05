const express = require('express')
const router = express.Router()

router.get('/v2/my-applications', function(req, res) {
  if (!req.session.data.assignedApplications.includes(req.session.data.refNo))
    req.session.data.assignedApplications.push(req.session.data.refNo);
  res.render('./v2/my-applications');
});


module.exports = router
