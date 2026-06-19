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

    resultValue.textContent = formatYearsMonths(minValue);
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

  updateResultCard();
});
