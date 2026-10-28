/* global $ */

//
// For guidance on how to add JavaScript see:
// https://prototype-kit.service.gov.uk/docs/adding-css-javascript-and-images
//


$(document).ready(function () {
  window.MOJFrontend.initAll()
})


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
