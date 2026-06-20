document.addEventListener('DOMContentLoaded', () => {
  const isHistoricoPage = document.body.classList.contains('historico-page');
  const isSegundoPage = document.body.classList.contains('segundo-page');
  const sessionPenaltyKey = 'dosimetria:firstPhaseResult';
  const toggleButtons = document.querySelectorAll('.circumstance-card__toggle');
  const quantityValue = document.querySelector('.section-circumstances__quantity span:last-child');
  const intervalLabel = document.querySelector('.section__interval span:last-child');
  const resultValue = document.querySelector('.section-result-card__value');
  const resultNote = document.querySelector('.section-result-card__note');
  const penaMinInput = document.querySelector('#pena-minima');
  const penaMaxInput = document.querySelector('#pena-maxima');
  const form = document.querySelector('#dosimetria-form');
  const secondPhaseReferenceValue = document.querySelector('.segundo-reference-card h1');
  const secondPhaseCurrentValue = document.querySelector('.segundo-current-card strong');
  const secondPhaseCurrentNote = document.querySelector('.segundo-current-card p');

  function formatYearsMonths(years) {
    const rounded = Math.max(0, Math.round(years));
    return `${rounded} anos, 0 meses`;
  }

  function computePenalty(minValue, selectedCount) {
    const factor = 1 + selectedCount / 8;
    return Math.round(minValue * factor * 12);
  }

  function formatPenalty(totalMonths) {
    const safeMonths = Math.max(0, Math.round(totalMonths));
    const years = Math.floor(safeMonths / 12);
    const months = safeMonths % 12;
    return {
      years,
      months,
      text: `${years} anos, ${months} meses`,
      shortText: `${String(years).padStart(2, '0')}a ${String(months).padStart(2, '0')}m 00d`
    };
  }

  function saveFirstPhaseResult(result) {
    try {
      window.sessionStorage.setItem(sessionPenaltyKey, JSON.stringify(result));
    } catch (error) {
      console.warn('Não foi possível salvar o cálculo da 1ª fase na sessão.', error);
    }
  }

  function loadFirstPhaseResult() {
    try {
      const rawValue = window.sessionStorage.getItem(sessionPenaltyKey);
      return rawValue ? JSON.parse(rawValue) : null;
    } catch (error) {
      console.warn('Não foi possível ler o cálculo da 1ª fase da sessão.', error);
      return null;
    }
  }

  function applySecondPhaseResult() {
    if (!isSegundoPage) return;

    const storedResult = loadFirstPhaseResult();
    if (!storedResult) return;

    const totalMonths = Number(storedResult.totalMonths) || 0;
    const penalty = formatPenalty(totalMonths);
    const baseText = storedResult.resultText || penalty.text;

    if (secondPhaseReferenceValue) {
      secondPhaseReferenceValue.textContent = `Pena-Base Fixada: ${baseText}`;
    }

    if (secondPhaseCurrentValue) {
      secondPhaseCurrentValue.textContent = penalty.shortText;
    }

    if (secondPhaseCurrentNote) {
      secondPhaseCurrentNote.innerHTML = '<span aria-hidden="true">↔</span> Pena-base carregada da 1ª fase';
    }
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
    const result = formatPenalty(totalMonths);

    resultValue.textContent = result.text;
    resultNote.textContent = selectedCount > 0
      ? `${selectedCount} circunstância${selectedCount === 1 ? '' : 's'} negativa${selectedCount === 1 ? '' : 's'} aplicada${selectedCount === 1 ? '' : 's'}.`
      : 'Nenhuma circunstância negativa aplicada.';

    updateInterval();

    saveFirstPhaseResult({
      minValue,
      maxValue,
      selectedCount,
      totalMonths,
      resultText: result.text,
      resultShortText: result.shortText
    });
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

  const profileQuickAction = document.querySelector('[data-app-action="profile"]');

  const historySearchInput = document.querySelector('#historico-search-input');
  const historySearchForm = document.querySelector('#historico-search-form');
  const historyCards = Array.from(document.querySelectorAll('[data-history-card]'));
  const historyLoadMoreButton = document.querySelector('#historico-load-more');
  const historyFilterButton = document.querySelector('.historico-filter-button');

  function updateHistoryVisibility() {
    if (!historySearchInput || historyCards.length === 0) return;

    const query = historySearchInput.value.trim().toLowerCase();
    let visibleCount = 0;

    historyCards.forEach(card => {
      const searchableText = (card.getAttribute('data-searchable-text') || '').toLowerCase();
      const isVisible = query === '' || searchableText.includes(query);
      card.hidden = !isVisible;
      if (isVisible) visibleCount += 1;
    });

    if (historyLoadMoreButton) {
      historyLoadMoreButton.hidden = visibleCount === 0;
      historyLoadMoreButton.textContent = query ? 'LIMPAR FILTRO' : 'CARREGAR MAIS REGISTROS';
    }
  }

  if (historySearchInput) {
    historySearchInput.addEventListener('input', updateHistoryVisibility);
  }

  if (historySearchForm) {
    historySearchForm.addEventListener('submit', event => {
      event.preventDefault();
      updateHistoryVisibility();
    });
  }

  if (historyLoadMoreButton) {
    historyLoadMoreButton.addEventListener('click', () => {
      if (historySearchInput && historySearchInput.value.trim() !== '') {
        historySearchInput.value = '';
        updateHistoryVisibility();
        historySearchInput.focus();
      } else {
        showDevWarning('Mais registros podem ser carregados aqui em uma integração futura.');
      }
    });
  }

  if (historyFilterButton) {
    historyFilterButton.addEventListener('click', () => {
      const isPressed = historyFilterButton.getAttribute('aria-pressed') === 'true';
      historyFilterButton.setAttribute('aria-pressed', String(!isPressed));
      showDevWarning('Filtro visual acionado. A filtragem por campos pode ser expandida depois.');
    });
  }

  if (profileQuickAction) {
    profileQuickAction.addEventListener('click', () => {
      showDevWarning('Perfil ainda não está disponível nesta versão.');
    });
  }

  document.querySelectorAll('[data-history-action]').forEach(button => {
    button.addEventListener('click', () => {
      const action = button.getAttribute('data-history-action');
      if (action === 'delete') {
        const card = button.closest('[data-history-card]');
        if (card) {
          card.remove();
          updateHistoryVisibility();
        }
        showDevWarning('Registro removido da visualização local.');
        return;
      }

      if (action === 'pdf') {
        showDevWarning('Geração de PDF ainda não está integrada.');
        return;
      }

      if (action === 'details') {
        showDevWarning('Detalhes do processo podem ser abertos aqui.');
      }
    });
  });

  if (isHistoricoPage) {
    updateHistoryVisibility();
  }

  applySecondPhaseResult();

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
  const warnSelectors = ['.action-button', '.footer__links a', '.historico-card__action', '.historico-card__delete'];
  document.querySelectorAll(warnSelectors.join(',')).forEach(el => {
    el.addEventListener('click', () => {
      showDevWarning('Este site ainda está em desenvolvimento');
    });
  });

  updateResultCard();
});
