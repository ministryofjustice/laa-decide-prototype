//
// For guidance on how to create routes see:
// https://prototype-kit.service.gov.uk/docs/create-routes
//

const govukPrototypeKit = require('govuk-prototype-kit')
const router = govukPrototypeKit.requests.setupRouter()

// add an item to the application history

router.post('/send-back-check', function(request, response) {

    var sendbackCheck = request.session.data['rejection-reason']
    if (sendbackCheck == "rfi") {
        response.redirect("/static/my-applications-rfi")
    }  else if (sendbackCheck == "withdraw") {
      response.redirect("/static/my-applications-withdraw")
    }  else {
      response.redirect("/static/my-applications-rejected")
    }
});

module.exports = router
