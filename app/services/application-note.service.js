/*
  * this is where we create a note that can be pushed to the application stack
*/
const moment = require('moment');
const createNote = async (application, user_display_name, title, content) => {
    try {
        var new_note = {
            'when': moment(),
            'who': user_display_name,
            'role': null,
            'title': title,
            'text': content
        };
        application.applicationDetails.notes.push(new_note);
    } catch(e) {
        throw new Error(e.message)
    }
}

module.exports = {
    createNote
}