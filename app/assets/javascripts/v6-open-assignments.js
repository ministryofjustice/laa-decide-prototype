document.addEventListener('DOMContentLoaded', () => {
  const toastContainer = document.getElementById('toast-notification');
  let reloadTimer;
  const failures = new Map();
  let navigating = false;

  function showMessage(title, message, success) {
    const banner = document.createElement('div');
    banner.className = 'govuk-notification-banner' + (success ? ' govuk-notification-banner--success' : '');
    banner.setAttribute('role', success ? 'status' : 'alert');
    banner.innerHTML = '<div class="govuk-notification-banner__header"><h2 class="govuk-notification-banner__title"></h2></div><div class="govuk-notification-banner__content"><p class="govuk-notification-banner__heading"></p></div>';
    banner.querySelector('h2').textContent = title;
    banner.querySelector('p').textContent = message;
    toastContainer.replaceChildren(banner);
  }

  function showFailures() {
    showMessage('There is a problem',
      'Could not assign ' + [...failures.values()].join(', ') + ' to your list. Try again.', false);
  }

  const queue = createAssignmentQueue(async ({ reference, isPriorAuthority, link }) => {
    try {
      const response = await fetch('/v6/add-application/' + encodeURIComponent(reference) + '?isPriorAuthority=' + isPriorAuthority, {
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
      });
      if (!response.ok) throw new Error('Assignment failed with status ' + response.status);
      const data = await response.json();
      if (!data.success) throw new Error('Assignment was not confirmed');
      failures.delete(link);
      const linkedCount = Number(data.linkedAddedCount) || 0;
      const linkedLabel = linkedCount === 1 ? 'linked case' : 'linked cases';
      if (!failures.size) {
        showMessage('Success', linkedCount > 0
          ? 'You have added ' + reference + ' and ' + linkedCount + ' ' + linkedLabel + ' to your list'
          : 'You have added ' + reference + ' to your list', true);
      } else showFailures();
    } catch (error) {
      failures.set(link, reference);
      link.removeAttribute('aria-disabled');
      console.error('Unable to assign application:', error);
      showFailures();
      throw error;
    }
  }, () => {
    if (!failures.size && !navigating) reloadTimer = setTimeout(() => window.location.reload(), 1000);
  });

  document.querySelectorAll('.add-to-list').forEach(link => {
    link.addEventListener('click', event => {
      event.preventDefault();
      if (link.getAttribute('aria-disabled') === 'true') return;
      clearTimeout(reloadTimer);
      link.setAttribute('aria-disabled', 'true');
      const reference = link.getAttribute('data-ref');
      const isPriorAuthority = link.getAttribute('data-is-prior-authority') === 'true';
      queue.enqueue({ reference, isPriorAuthority, link }).catch(() => {});
    });
  });

  document.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (!queue.pending || !link || link.classList.contains('add-to-list')
        || link.getAttribute('href').startsWith('#') || link.target
        || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigating = true;
    queue.whenIdle().then(() => {
      if (!failures.size) window.location.assign(link.href);
      else navigating = false;
    });
  });

  document.addEventListener('submit', event => {
    if (!queue.pending) return;
    event.preventDefault();
    const form = event.target;
    const submitter = event.submitter;
    navigating = true;
    queue.whenIdle().then(() => {
      if (!failures.size) form.requestSubmit(submitter || undefined);
      else navigating = false;
    });
  }, true);

  window.addEventListener('beforeunload', event => {
    if (queue.pending) {
      event.preventDefault();
      event.returnValue = '';
    }
  });
});
