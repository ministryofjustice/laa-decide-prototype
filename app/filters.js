//
// For guidance on how to create filters see:
// https://prototype-kit.service.gov.uk/docs/filters
//

const govukPrototypeKit = require('govuk-prototype-kit')
const addFilter = govukPrototypeKit.views.addFilter

// Add your filters here


  var filters = {}

  /* ------------------------------------------------------------------
    add your methods to the filters obj below this comment block:
    @example:

    filters.sayHi = function(name) {
        return 'Hi ' + name + '!'
    }

    Which in your templates would be used as:

    {{ 'Paul' | sayHi }} => 'Hi Paul'

    Notice the first argument of your filters method is whatever
    gets 'piped' via '|' to the filter.

    Filters can take additional arguments, for example:

    filters.sayHi = function(name,tone) {
      return (tone == 'formal' ? 'Greetings' : 'Hi') + ' ' + name + '!'
    }

    Which would be used like this:

    {{ 'Joel' | sayHi('formal') }} => 'Greetings Joel!'
    {{ 'Gemma' | sayHi }} => 'Hi Gemma!'

    For more on filters and how to write them see the Nunjucks
    documentation.

  ------------------------------------------------------------------ */
  const moment = require('moment');

  filters.date_parameter_for_filter = function(dateString) {
    return moment(dateString, 'DD/MM/YYYY').utcOffset('+0000').add(1, 'hours');
  };

  filters.submitted_date_for_filter = function(dateString) {
    return moment(dateString).utcOffset('+0000');
  };

  filters.date = function(dateString) {
    if (moment(dateString).format() === 'Invalid date'){
      return dateString;
    }
    else{
      return moment(dateString).format('DD MMM YYYY');
    }
  };

  filters.application_date = function(dateString) {
    if (moment(dateString).format() === 'Invalid date'){
      return dateString;
    }
    else{
      return moment(dateString).format('ddd DD MMM');
    }
  };

  filters.history_date = function(dateString) {
    if (moment(dateString).format() === 'Invalid date'){
      return dateString;
    }
    else{
      return moment(dateString).format('DD MMM YYYY HH:mm');
    }
  };

// Add the filters using the addFilter function
Object.entries(filters).forEach(([name, fn]) => addFilter(name, fn))
