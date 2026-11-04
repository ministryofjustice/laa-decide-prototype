window.addEventListener('load', function () {
  const targetId = new URLSearchParams(window.location.search).get('focus') || window.location.hash.slice(1);
  if (!targetId) return;

  const target = document.getElementById(targetId);
  if (!target) return;

  const field = target.matches('input, select, textarea, button')
    ? target
    : target.querySelector('input:checked') || target.querySelector('input, select, textarea');
  if (field && !field.disabled && field.getClientRects().length) {
    field.focus();
    field.scrollIntoView({ block: 'center' });
  }
});
