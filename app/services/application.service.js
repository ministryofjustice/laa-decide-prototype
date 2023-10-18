/*
  * this is where we create a note that can be pushed to the application stack
*/
const moment = require('moment');
const {ApplicationService} = require("./index");

const create_note =  (user_display_name, title, content) => {
    try {
        var new_note = {
            'when': moment(),
            'who': user_display_name,
            'role': null,
            'title': title,
            'text': content
        };
        return new_note;

    } catch (e) {
        throw new Error(e.message)
    }
}

const find_application = (req) =>{
    return req.session.data.applications.find(currentApplication);

    function currentApplication(application) {
        return application.applicationDetails.refNo === req.session.data.refNo;
    }
}
const assign_application = async (req) => {
    const application = find_application(req);
    if (!req.session.data.assignedApplications.includes(req.session.data.refNo)) {
        req.session.data.assignedApplications.push(req.session.data.refNo);
        // add an item to the application history if not added before
        let new_note = create_note(
            'You',
            'Application added to workload',
            null);
        application.applicationDetails.notes.push(new_note);

    }
}

const unassign_application = async (req) => {
    const application = find_application(req);
    try{
        req.session.data.assignedApplications.splice(
            req.session.data.assignedApplications.indexOf(req.session.data.refNoToRemove), 1);

        // add an item to the application history
        var other_reason = '';
        if (req.session.data['removal-reason-other']){
            other_reason = ' - ' + req.session.data['removal-reason-other'];
        }
        application.applicationDetails.notes.push(
            create_note(
                'You',
                'Application removed from workload',
                req.session.data['removal-reason'] + other_reason ));

    } catch (e) {
    throw new Error(e.message)
}

    }



module.exports = {
    create_note,
    find_application,
    assign_application,
    unassign_application
}