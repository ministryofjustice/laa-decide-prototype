/* global $ */

//
// For guidance on how to add JavaScript see:
// https://prototype-kit.service.gov.uk/docs/adding-css-javascript-and-images
//


$(document).ready(function () {
  window.MOJFrontend.initAll()
})


// Toggle filter button on Open Applications and My Applications pages
new MOJFrontend.FilterToggleButton({
  bigModeMediaQuery: '(min-width: 48.063em)',
  startHidden: true,
  toggleButton: {
    container: $('.moj-action-bar__filter'),
    showText: 'Show filter',
    hideText: 'Hide filter',
    classes: 'govuk-button--filter'
  },
  closeButton: {
    container: $('.moj-filter__header-action'),
    text: 'Close'
  },
  filter: {
    container: $('.moj-filter')
  }
});

// Makes cards on the Home page clickable
window.onload = function() {
  document.querySelectorAll('.card--clickable').forEach(card => {
    if (card.querySelector('a') !== null) {
      card.addEventListener('click', () => {
        card.querySelector('a').click()
      })
    }
  })
}
