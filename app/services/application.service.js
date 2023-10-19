/*
  * this is where we create a note that can be pushed to the application stack
*/
const moment = require('moment');

const create_note =  (user_display_name, title, content) => {
    const new_note = {
        'when': moment(),
        'who': user_display_name,
        'role': null,
        'title': title,
        'text': content
    };
    return new_note;
}

const find_application = (req) =>{
    return req.session.data.applications.find(currentApplication);
    function currentApplication(application) {
        return application.applicationDetails.refNo === req.session.data.refNo;
    }
}
const assign_application = async (req) =>
{
    const application = find_application(req);
    //only assign the application if it has not already been assigned
    if (!req.session.data.assignedApplications.includes(req.session.data.refNo))
    {
        req.session.data.assignedApplications.push(req.session.data.refNo);
        // add an item to the application history if not added before
        let new_note = create_note(
            'You',
            'Application added to workload',
            null);
        application.applicationDetails.notes.push(new_note);

    }
}

const unassign_application = async (req) =>
{
    const application = find_application(req);
    req.session.data.assignedApplications.splice(
        req.session.data.assignedApplications.indexOf(req.session.data.refNoToRemove), 1);

    // add an item to the application history
    let note = req.session.data['removal-reason'];
    if (req.session.data['removal-reason-other'])
    {
        note = note + ' - ' + req.session.data['removal-reason-other'];
    }

    application.applicationDetails.notes.push(
        create_note(
            'You',
            'Application removed from workload',
            note ));
}

const return_application_to_provider = async (req) => {
    let application = find_application(req);
    // we do not want to reject if this is a request for further information
    if (!(req.session.data['rejection-reason'] === 'RFI'))
    {
        application['applicationDetails']['meritsAssessmentResult'] = 'rejected';
        application['applicationDetails']['meansAssessmentResult'] = 'rejected';
    }
    else
    {
            application['applicationDetails']['meritsAssessmentResult'] = 'RFI';
            application['applicationDetails']['meansAssessmentResult'] = 'RFI';
            //display the banner to say more information has been requested
            req.session.data['request-more-information'] = 'display-banner-now';
    }

    let note = req.session.data['rejection-reason'];
    //the user may fill this note in for any reason
    if (req.session.data['request-more-information'] && req.session.data['request-more-information'].length>0){
        note = note + ' - ' + req.session.data['request-more-information'];
    }
    // add an item to the application history
    application.applicationDetails.notes.push(
        create_note(
        'You',
        'Application sent back to provider',
        note));
}

const update_merits_results = async (req) =>
{
    for (const proceeding of find_application(req)['applicationDetails']['proceedings']) {
        for (const certificate of proceeding['certificates']) {
            if (typeof req.session.data[certificate['id']] !== 'undefined' && req.session.data[certificate['id']] !== null) {
                certificate['meritsResult'] = req.session.data[certificate['id']];
            }
        }

    }
    return true;
}


module.exports = {
    create_note,
    find_application,
    assign_application,
    unassign_application,
    update_merits_results,
    return_application_to_provider
}