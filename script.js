document.addEventListener('DOMContentLoaded', () => {
  const toggleButtons = document.querySelectorAll('.circumstance-card__toggle');
  const quantityValue = document.querySelector('.section-circumstances__quantity span:last-child');
  const intervalLabel = document.querySelector('.section__interval span:last-child');
  const resultValue = document.querySelector('.section-result-card__value');
  const resultNote = document.querySelector('.section-result-card__note');
  const penaMinInput = document.querySelector('#pena-minima');
  const penaMaxInput = document.querySelector('#pena-maxima');
  const form = document.querySelector('#dosimetria-form');

  function formatYearsMonths(years) {
    const rounded = Math.max(0, Math.round(years));
    return `${rounded} anos, 0 meses`;
  }

  function computePenalty(minValue, selectedCount) {
    const factor = 1 + selectedCount / 8;
    return Math.round(minValue * factor * 12);
  }

  function updateQuantity() {
    const selectedCount = Array.from(toggleButtons).filter(button => button.getAttribute('aria-pressed') === 'true').length;
    if (quantityValue) {
      quantityValue.textContent = `${selectedCount} / ${toggleButtons.length}`;
    }
    return selectedCount;
  }

  function updateInterval() {
    if (!intervalLabel || !penaMinInput || !penaMaxInput) return;
    const minValue = Number(penaMinInput.value) || 0;
    const maxValue = Number(penaMaxInput.value) || minValue;
    const diff = Math.max(0, maxValue - minValue);
    intervalLabel.textContent = `${diff} anos`;
  }

  function updateResultCard() {
    if (!resultValue || !resultNote || !penaMinInput || !penaMaxInput) return;

    const minValue = Math.max(0, Number(penaMinInput.value) || 0);
    const maxValue = Math.max(minValue, Number(penaMaxInput.value) || minValue);
    const selectedCount = updateQuantity();
    const totalMonths = computePenalty(minValue, selectedCount);
    const resultYears = Math.floor(totalMonths / 12);
    const resultMonths = totalMonths % 12;

    resultValue.textContent = `${resultYears} anos, ${resultMonths} meses`;
    resultNote.textContent = selectedCount > 0
      ? `${selectedCount} circunstância${selectedCount === 1 ? '' : 's'} negativa${selectedCount === 1 ? '' : 's'} aplicada${selectedCount === 1 ? '' : 's'}.`
      : 'Nenhuma circunstância negativa aplicada.';

    updateInterval();
  }

  function resetSelections() {
    toggleButtons.forEach(button => button.setAttribute('aria-pressed', 'false'));
    updateResultCard();
  }

  toggleButtons.forEach(button => {
    button.addEventListener('click', () => {
      const isPressed = button.getAttribute('aria-pressed') === 'true';
      button.setAttribute('aria-pressed', String(!isPressed));
      updateResultCard();
    });
  });

  if (form) {
    form.addEventListener('submit', event => {
      event.preventDefault();
      updateResultCard();
    });

    form.addEventListener('reset', () => {
      window.requestAnimationFrame(() => {
        resetSelections();
      });
    });
  }

  if (penaMinInput) {
    penaMinInput.addEventListener('input', updateResultCard);
  }

  if (penaMaxInput) {
    penaMaxInput.addEventListener('input', updateResultCard);
  }
  // Development warning toast
  const devToast = document.createElement('div');
  devToast.className = 'dev-toast';
  devToast.setAttribute('role', 'status');
  devToast.setAttribute('aria-live', 'polite');
  devToast.setAttribute('aria-hidden', 'true');
  document.body.appendChild(devToast);
  let devToastTimer = null;

  function showDevWarning(msg = 'Este site ainda está em desenvolvimento') {
    devToast.textContent = msg;
    devToast.setAttribute('aria-hidden', 'false');
    devToast.classList.add('show');
    if (devToastTimer) clearTimeout(devToastTimer);
    devToastTimer = setTimeout(() => {
      devToast.classList.remove('show');
      devToast.setAttribute('aria-hidden', 'true');
      devToastTimer = null;
    }, 3000);
  }

  // Attach warning to primary interactive elements (navigation, footer links, action buttons)
  const warnSelectors = ['.action-button', '.bottom-nav-bar__item', '.footer__links a'];
  document.querySelectorAll(warnSelectors.join(',')).forEach(el => {
    el.addEventListener('click', () => {
      showDevWarning('Este site ainda está em desenvolvimento');
    });
  });

  updateResultCard();
});
