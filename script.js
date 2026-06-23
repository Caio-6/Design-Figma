document.addEventListener('DOMContentLoaded', () => {
  const isHistoricoPage = document.body.classList.contains('historico-page');
  const isIndexPage = document.body.classList.contains('index-page');
  const isSegundoPage = document.body.classList.contains('segundo-page');
  const isTerceiroPage = document.body.classList.contains('terceiro-page');
  const sessionPenaltyKey = 'dosimetria:firstPhaseResult';
  const sessionDataKey = 'dosimetria:sessionData';
  const historyStorageKey = 'dosimetria:historyItems';
  const saveDraftButtons = document.querySelectorAll('.save-draft-button');
  const historyListContainer = document.querySelector('.historico-list');
  let historyCards = Array.from(document.querySelectorAll('[data-history-card]'));
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
  const segundoPhaseCheckboxes = document.querySelectorAll('.segundo-factor-item input[type="checkbox"]');
  const segundoPhaseSelects = document.querySelectorAll('.segundo-factor-item select');
  const thirdPhaseMajorSelect = document.querySelector('#fracao-aumento');
  const thirdPhaseMinorSelect = document.querySelector('#fracao-diminuicao');
  const thirdPhaseMajorDevice = document.querySelector('#dispositivo-majorante');
  const thirdPhaseMinorDevice = document.querySelector('#dispositivo-minorante');
  const thirdPhaseObservations = document.querySelector('#observacoes');
  const thirdPhaseSelects = document.querySelectorAll('#fracao-aumento, #fracao-diminuicao');

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

  function saveDosimetriaSession(data) {
    try {
      // Salva o estado na sessão (temporário) e também em localStorage
      window.sessionStorage.setItem(sessionDataKey, JSON.stringify(data));
      try {
        window.localStorage.setItem(sessionDataKey, JSON.stringify(data));
      } catch (err) {
        // localStorage pode falhar por espaço ou modo privado; não interrompe a execução
        console.warn('Não foi possível salvar o estado da dosimetria no localStorage.', err);
      }
    } catch (error) {
      console.warn('Não foi possível salvar o estado da dosimetria na sessão.', error);
    }
  }

  function loadDosimetriaSession() {
    try {
      // Prioriza sessionStorage (dados da sessão atual). Se não houver, tenta localStorage.
      const rawSession = window.sessionStorage.getItem(sessionDataKey);
      if (rawSession) return JSON.parse(rawSession);
      const rawLocal = window.localStorage.getItem(sessionDataKey);
      return rawLocal ? JSON.parse(rawLocal) : {};
    } catch (error) {
      console.warn('Não foi possível ler o estado da dosimetria da sessão.', error);
      return {};
    }
  }

  function saveDosimetriaSessionPhase(phase, result) {
    const session = loadDosimetriaSession();
    session[phase] = result;
    saveDosimetriaSession(session);
    return session;
  }

  function saveFirstPhaseResult(result) {
    try {
      window.sessionStorage.setItem(sessionPenaltyKey, JSON.stringify(result));
      try {
        window.localStorage.setItem(sessionPenaltyKey, JSON.stringify(result));
      } catch (err) {
        console.warn('Não foi possível salvar o cálculo da 1ª fase no localStorage.', err);
      }
    } catch (error) {
      console.warn('Não foi possível salvar o cálculo da 1ª fase na sessão.', error);
    }
    saveDosimetriaSessionPhase('firstPhase', result);
  }

  function loadHistoryItems() {
    try {
      const raw = window.localStorage.getItem(historyStorageKey);
      return raw ? JSON.parse(raw) : [];
    } catch (error) {
      console.warn('Não foi possível ler o histórico de dosimetria.', error);
      return [];
    }
  }

  function saveHistoryItems(items) {
    try {
      window.localStorage.setItem(historyStorageKey, JSON.stringify(items));
    } catch (error) {
      console.warn('Não foi possível salvar o histórico de dosimetria.', error);
    }
  }

  function createDraftEntry(entry) {
    const now = new Date();
    return {
      id: `draft-${now.getTime()}`,
      stage: entry.stage,
      title: entry.title,
      subtitle: `${now.toLocaleDateString('pt-BR')} • ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
      status: 'RASCUNHO',
      summary: entry.summary,
      details: entry.details,
      searchableText: `${entry.stage} ${entry.summary} ${entry.details}`
    };
  }

  function getSelectedCircumstanceNames() {
    return Array.from(toggleButtons)
      .filter(button => button.getAttribute('aria-pressed') === 'true')
      .map(button => button.closest('.circumstance-card')?.querySelector('.circumstance-card__title')?.textContent.trim() || 'Item selecionado');
  }

  function gatherPhaseDraft() {
    const now = new Date();
    if (isIndexPage) {
      const selected = getSelectedCircumstanceNames();
      const summary = `${resultValue?.textContent || 'Pena não calculada'} • ${selected.length} circunstância${selected.length === 1 ? '' : 's'}`;
      return createDraftEntry({
        stage: '1ª fase',
        title: 'Rascunho 1ª fase',
        summary,
        details: `Pena mínima: ${penaMinInput?.value || '-'} anos; Pena máxima: ${penaMaxInput?.value || '-'} anos; Circunstâncias: ${selected.join(', ') || 'Nenhuma'}`
      });
    }

    if (isSegundoPage) {
      const selectedInputs = Array.from(document.querySelectorAll('.segundo-factor-item input:checked'));
      const selectedNames = selectedInputs.map(input => input.labels?.[0]?.textContent?.trim() || input.value || 'Item selecionado');
      const summary = selectedNames.length > 0 ? selectedNames.join(', ') : 'Nenhuma seleção';
      return createDraftEntry({
        stage: '2ª fase',
        title: 'Rascunho 2ª fase',
        summary,
        details: selectedNames.length > 0 ? selectedNames.join(' • ') : 'Nenhuma circunstância selecionada.'
      });
    }

    if (isTerceiroPage) {
      const major = thirdPhaseMajorSelect?.value || 'Nenhuma';
      const minor = thirdPhaseMinorSelect?.value || 'Nenhuma';
      const majorDevice = thirdPhaseMajorDevice?.value || 'Não informado';
      const minorDevice = thirdPhaseMinorDevice?.value || 'Não informado';
      const notes = thirdPhaseObservations?.value.trim() || 'Sem observações.';
      return createDraftEntry({
        stage: '3ª fase',
        title: 'Rascunho 3ª fase',
        summary: `Majorante ${major}; Minorante ${minor}`,
        details: `Majorante: ${majorDevice}; Minorante: ${minorDevice}; Observações: ${notes}`
      });
    }
    return null;
  }

  function renderHistoryCardEntry(entry) {
    if (!historyListContainer) return;
    const loadMoreButton = document.querySelector('#historico-load-more');
    const card = document.createElement('article');
    card.className = 'historico-card saved-draft-card';
    card.dataset.historyCard = '';
    // Build friendly details text when entry.details is JSON
    let friendlyDetails = entry.details || '';
    try {
      if (typeof friendlyDetails === 'string' && /^[\{\[]/.test(friendlyDetails.trim())) {
        const parsed = JSON.parse(friendlyDetails);
        const f = parsed.first || parsed.firstPhase || parsed.first || {};
        const s = parsed.second || parsed.secondPhase || parsed.second || {};
        const t = parsed.third || parsed.thirdPhase || parsed.third || {};
        const parts = [];
        if (f && f.resultText) parts.push(`1ª: ${f.resultText}`);
        if (s && s.resultText) parts.push(`2ª: ${s.resultText}`);
        if (t && t.resultText) parts.push(`3ª: ${t.resultText}`);
        if (t && t.observations) parts.push(`Obs: ${t.observations}`);
        friendlyDetails = parts.join(' • ');
      }
    } catch (e) {
      // keep original details string on parse error
    }

    const penaDisplay = entry.penaFinal || entry.summary || '';
    card.dataset.searchableText = `${entry.searchableText || ''} ${penaDisplay}`;
    card.innerHTML = `
      <div class="historico-card__accent" aria-hidden="true"></div>
      <div class="historico-card__body">
        <div class="historico-card__meta-group">
          <span class="historico-card__eyebrow">FASE</span>
          <strong class="historico-card__name">${entry.stage}</strong>
          <span class="historico-card__process">${entry.title}</span>
        </div>
        <div class="historico-card__meta-group">
          <span class="historico-card__eyebrow">RESUMO</span>
          <span class="historico-card__crime">${entry.summary}</span>
          <span class="historico-card__crime-detail">${friendlyDetails}</span>
        </div>
        <div class="historico-card__meta-group">
          <span class="historico-card__eyebrow">STATUS</span>
          <span class="historico-card__regime">${entry.status}</span>
          <span class="historico-card__date">${entry.subtitle}</span>
        </div>
        <div class="historico-card__meta-group">
          <span class="historico-card__eyebrow">PENA FINAL</span>
          <span class="historico-card__penalty">${penaDisplay}</span>
        </div>
        <div class="historico-card__divider" aria-hidden="true"></div>

        <div class="historico-card__actions">
          <button type="button" class="historico-card__action historico-card__action--primary" data-history-action="details">
            <span class="historico-icon historico-icon--eye" aria-hidden="true"></span>
            DETALHES
          </button>
          <button type="button" class="historico-card__action historico-card__action--secondary" data-history-action="pdf">
            <span class="historico-icon historico-icon--pdf" aria-hidden="true"></span>
            GERAR PDF
          </button>
        </div>

        <button type="button" class="historico-card__delete" data-history-action="delete">
          <span class="historico-icon historico-icon--trash" aria-hidden="true"></span>
          EXCLUIR
        </button>
      </div>
    `;
    if (loadMoreButton) {
      historyListContainer.insertBefore(card, loadMoreButton);
    } else {
      historyListContainer.appendChild(card);
    }
    // Attach action handlers for the newly created card
    card.querySelectorAll('[data-history-action]').forEach(button => {
      button.addEventListener('click', () => {
        const action = button.getAttribute('data-history-action');
        if (action === 'delete') {
          card.remove();
          // Also remove from storage
          const items = loadHistoryItems().filter(i => i.id !== entry.id);
          saveHistoryItems(items);
          updateHistoryVisibility();
          showDevWarning('Registro removido do histórico.');
          return;
        }
        if (action === 'pdf') {
          // Rebuild report from entry if it is a final report, else show warning
          if (entry.penaFinal || entry.status === 'FINALIZADO') {
            const html = buildReportHtml(entry);
            if (window.html2pdf) {
              const container = document.createElement('div');
              container.style.position = 'fixed';
              container.style.left = '-9999px';
              container.innerHTML = html;
              document.body.appendChild(container);
              window.html2pdf().from(container).save(`relatorio-historico-${entry.id}.pdf`).then(() => {
                document.body.removeChild(container);
              }).catch(() => { document.body.removeChild(container); openPrintWindow(html); });
            } else {
              openPrintWindow(buildReportHtml(entry));
            }
          } else {
            showDevWarning('Registro não finalizado — não há relatório completo para PDF.');
          }
          return;
        }
        if (action === 'details') {
          showDevWarning('Abrir detalhes do registro (funcionalidade futura).');
        }
      });
    });
  }

  function restoreHistoryFromStorage() {
    if (!isHistoricoPage || !historyListContainer) return;
    const items = loadHistoryItems();
    items.forEach(renderHistoryCardEntry);
    historyCards = Array.from(document.querySelectorAll('[data-history-card]'));
  }

  function addDraftToHistory() {
    const entry = gatherPhaseDraft();
    if (!entry) return;
    const items = loadHistoryItems();
    items.unshift(entry);
    saveHistoryItems(items);
    if (isHistoricoPage) {
      renderHistoryCardEntry(entry);
      historyCards = Array.from(document.querySelectorAll('[data-history-card]'));
      updateHistoryVisibility();
    }
    showDevWarning('Rascunho salvo no histórico.');
  }

  function loadFirstPhaseResult() {
    try {
      const session = loadDosimetriaSession();
      if (session.firstPhase) return session.firstPhase;
      const rawValue = window.sessionStorage.getItem(sessionPenaltyKey) || window.localStorage.getItem(sessionPenaltyKey);
      return rawValue ? JSON.parse(rawValue) : null;
    } catch (error) {
      console.warn('Não foi possível ler o cálculo da 1ª fase da sessão.', error);
      return null;
    }
  }

  function parseFractionValue(value) {
    if (!value) return 0;
    const normalized = value.toString().trim();
    if (/nenhuma/i.test(normalized)) return 0;
    const match = normalized.match(/(\d+)\s*\/\s*(\d+)/);
    if (match) {
      const numerator = Number(match[1]);
      const denominator = Number(match[2]);
      return denominator ? numerator / denominator : 0;
    }
    return 0;
  }

  function computeAjustedPenalty(baseMonths, aggravations, mitigations) {
    const factor = 1 + aggravations - mitigations;
    return Math.max(0, Math.round(baseMonths * factor));
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

  function updateSecondPhaseResult() {
    if (!isSegundoPage) return;
    const firstPhase = loadDosimetriaSession().firstPhase || loadFirstPhaseResult();
    const baseMonths = Number(firstPhase?.totalMonths) || 0;
    if (baseMonths === 0) {
      if (secondPhaseReferenceValue) {
        secondPhaseReferenceValue.textContent = 'Pena-Base não disponível';
      }
      if (secondPhaseCurrentValue) {
        secondPhaseCurrentValue.textContent = '00a 00m 00d';
      }
      if (secondPhaseCurrentNote) {
        secondPhaseCurrentNote.textContent = 'Calcule a 1ª fase antes de aplicar a 2ª fase.';
      }
      return;
    }

    if (secondPhaseReferenceValue) {
      const penalty = formatPenalty(baseMonths);
      secondPhaseReferenceValue.textContent = `Pena-Base Fixada: ${penalty.text}`;
    }

    const aggravations = Array.from(segundoPhaseCheckboxes)
      .filter(input => input.checked && input.closest('.segundo-factor-section--aggravating'))
      .reduce((sum, input) => {
        const select = input.closest('.segundo-factor-item')?.querySelector('select');
        return sum + (select ? parseFractionValue(select.value) : 1 / 6);
      }, 0);

    const mitigations = Array.from(segundoPhaseCheckboxes)
      .filter(input => input.checked && input.closest('.segundo-factor-section--mitigating'))
      .reduce((sum, input) => {
        const select = input.closest('.segundo-factor-item')?.querySelector('select');
        return sum + (select ? parseFractionValue(select.value) : 1 / 6);
      }, 0);

    const finalMonths = computeAjustedPenalty(baseMonths, aggravations, mitigations);
    const penalty = formatPenalty(finalMonths);
    if (secondPhaseCurrentValue) {
      secondPhaseCurrentValue.textContent = penalty.shortText;
    }
    if (secondPhaseCurrentNote) {
      secondPhaseCurrentNote.textContent = `Agravantes: ${aggravations.toFixed(2)} • Atenuantes: ${mitigations.toFixed(2)}`;
    }

    saveDosimetriaSessionPhase('secondPhase', {
      baseMonths,
      aggravations,
      mitigations,
      totalMonths: finalMonths,
      resultText: penalty.text,
      resultShortText: penalty.shortText
    });
  }

  function updateThirdPhaseResult() {
    if (!isTerceiroPage) return;
    const session = loadDosimetriaSession();
    const baseMonths = Number(session.secondPhase?.totalMonths || session.firstPhase?.totalMonths || 0);
    if (baseMonths === 0) {
      if (resultValue) {
        resultValue.textContent = '0 anos, 0 meses';
      }
      if (resultNote) {
        resultNote.textContent = 'Calcule as fases anteriores antes de aplicar a 3ª fase.';
      }
      return;
    }

    const majorFraction = parseFractionValue(thirdPhaseMajorSelect?.value || 'Nenhuma');
    const minorFraction = parseFractionValue(thirdPhaseMinorSelect?.value || 'Nenhuma');
    const majorDevice = thirdPhaseMajorDevice?.value?.trim() || '';
    const minorDevice = thirdPhaseMinorDevice?.value?.trim() || '';
    const observations = thirdPhaseObservations?.value?.trim() || '';

    // Apply major increases and minor decreases (fractions) to the base months
    const totalMonths = computeAjustedPenalty(baseMonths, majorFraction, minorFraction);
    const penalty = formatPenalty(totalMonths);

    if (resultValue) {
      resultValue.textContent = penalty.text;
    }
    if (resultNote) {
      const noteParts = [];
      if (majorFraction) noteParts.push(`Majorante: ${thirdPhaseMajorSelect?.value} ${majorDevice ? `(${majorDevice})` : ''}`);
      if (minorFraction) noteParts.push(`Minorante: ${thirdPhaseMinorSelect?.value} ${minorDevice ? `(${minorDevice})` : ''}`);
      if (observations) noteParts.push(`Observações: ${observations}`);
      resultNote.textContent = noteParts.length ? noteParts.join(' • ') : 'Nenhuma causa especial aplicada.';
    }

    saveDosimetriaSessionPhase('thirdPhase', {
      baseMonths,
      majorFraction,
      minorFraction,
      majorDevice,
      minorDevice,
      observations,
      totalMonths,
      resultText: penalty.text,
      resultShortText: penalty.shortText
    });
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

  segundoPhaseCheckboxes.forEach(input => {
    input.addEventListener('change', updateSecondPhaseResult);
  });

  segundoPhaseSelects.forEach(select => {
    select.addEventListener('change', updateSecondPhaseResult);
  });

  thirdPhaseSelects.forEach(select => {
    select.addEventListener('change', updateThirdPhaseResult);
  });

  saveDraftButtons.forEach(button => {
    button.addEventListener('click', addDraftToHistory);
  });

  const profileQuickAction = document.querySelector('[data-app-action="profile"]');

  const historySearchInput = document.querySelector('#historico-search-input');
  const historySearchForm = document.querySelector('#historico-search-form');
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
    restoreHistoryFromStorage();
    updateHistoryVisibility();
  }

  if (isSegundoPage) {
    updateSecondPhaseResult();
  }

  if (isTerceiroPage) {
    updateThirdPhaseResult();
  }

  applySecondPhaseResult();

  // Preencher pena provisória na 3ª fase e habilitar geração de relatório final
  if (isTerceiroPage) {
    const session = loadDosimetriaSession();
    const penaProvisoriaInput = document.querySelector('#pena-provisoria');
    const baseText = session.secondPhase?.resultText || session.firstPhase?.resultText || '';
    if (penaProvisoriaInput && baseText) {
      penaProvisoriaInput.value = baseText;
    }

    function createFinalHistoryEntry() {
      const now = new Date();
      const sessionData = loadDosimetriaSession();
      const first = sessionData.firstPhase || null;
      const second = sessionData.secondPhase || null;
      const third = sessionData.thirdPhase || null;
      const summary = third?.resultText || second?.resultText || first?.resultText || 'Pena não calculada';
      const details = {
        first,
        second,
        third,
        generatedAt: now.toISOString()
      };
      return {
        id: `entry-${now.getTime()}`,
        stage: 'Relatório final',
        title: 'Relatório final da dosimetria',
        subtitle: `${now.toLocaleDateString('pt-BR')} • ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
        status: 'FINALIZADO',
        summary,
        details: JSON.stringify(details),
        searchableText: `${summary} ${third?.observations || ''}`,
        penaFinal: third?.resultText || null,
        penaFinalMonths: third?.totalMonths || null
      };
    }

    function buildReportHtml(entry) {
      const sessionData = loadDosimetriaSession();
      const first = sessionData.firstPhase || {};
      const second = sessionData.secondPhase || {};
      const third = sessionData.thirdPhase || {};
      // Prepare penalty display values
      const firstMonths = Number(first.totalMonths) || 0;
      const secondBaseMonths = Number(second.baseMonths) || firstMonths || 0;
      const secondMonths = Number(second.totalMonths) || 0;
      const thirdMonths = Number(third.totalMonths) || 0;
      const firstPenalty = firstMonths ? formatPenalty(firstMonths) : { text: 'Não calculado', shortText: '00a 00m 00d' };
      const secondPenalty = secondMonths ? formatPenalty(secondMonths) : { text: 'Não calculado', shortText: '00a 00m 00d' };
      const thirdPenalty = thirdMonths ? formatPenalty(thirdMonths) : { text: 'Não calculado', shortText: '00a 00m 00d' };

      const html = `<!doctype html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${entry.title}</title>
        <style>
          body{font-family:Arial,Helvetica,sans-serif;padding:24px;color:#111}
          h1{font-size:20px;margin-bottom:6px}
          h2{font-size:14px;margin-top:18px;margin-bottom:6px}
          table{width:100%;border-collapse:collapse;margin-top:6px}
          th,td{border:1px solid #ddd;padding:8px;text-align:left}
          th{background:#f4f4f4}
          .summary{font-size:16px;margin-top:8px}
          pre{white-space:pre-wrap;background:#f6f6f6;padding:10px;border-radius:6px}
        </style>
      </head>
      <body>
        <h1>${entry.title}</h1>
        <div><strong>Data:</strong> ${entry.subtitle}</div>

        <h2>Cálculo detalhado por fase</h2>
        <table>
          <thead>
            <tr><th>Fase</th><th>Base</th><th>Parâmetros aplicados</th><th>Resultado</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>1ª fase</td>
              <td>${first.minValue || '-'} a ${first.maxValue || '-'} anos</td>
              <td>${first.selectedCount ? `${first.selectedCount} circunstância(s)` : 'Nenhuma'}</td>
              <td>${first.resultText || firstPenalty.text}</td>
            </tr>
            <tr>
              <td>2ª fase</td>
              <td>${secondBaseMonths ? formatPenalty(secondBaseMonths).text : '—'}</td>
              <td>Agravantes: ${typeof second.aggravations !== 'undefined' ? second.aggravations : '-'} • Atenuantes: ${typeof second.mitigations !== 'undefined' ? second.mitigations : '-'}</td>
              <td>${second.resultText || secondPenalty.text}</td>
            </tr>
            <tr>
              <td>3ª fase</td>
              <td>${(third.baseMonths || secondBaseMonths) ? formatPenalty(third.baseMonths || secondBaseMonths).text : '-'}</td>
              <td>Majorante: ${third.majorFraction || 0} • Minorante: ${third.minorFraction || 0}</td>
              <td>${third.resultText || thirdPenalty.text}</td>
            </tr>
          </tbody>
        </table>

        <h2>Detalhes do cálculo</h2>
        <table>
          <tbody>
            <tr><th>Elemento</th><th>Valor</th></tr>
            <tr><td>Pena base (meses)</td><td>${secondBaseMonths}</td></tr>
            <tr><td>Agravantes (soma de frações)</td><td>${second.aggravations ?? '-'}</td></tr>
            <tr><td>Atenuantes (soma de frações)</td><td>${second.mitigations ?? '-'}</td></tr>
            <tr><td>Pena após 2ª fase (meses)</td><td>${secondMonths}</td></tr>
            <tr><td>Majorante aplicado (fração)</td><td>${third.majorFraction ?? '-'}</td></tr>
            <tr><td>Minorante aplicado (fração)</td><td>${third.minorFraction ?? '-'}</td></tr>
            <tr><td>Pena final (meses)</td><td>${thirdMonths}</td></tr>
            <tr><td>Pena final (formatada)</td><td>${third.resultText || thirdPenalty.text}</td></tr>
          </tbody>
        </table>

        <h2>Observações</h2>
        <pre>${third.observations || 'Nenhuma'}</pre>

      </body>
      </html>`;

      return html;
    }

    function openPrintWindow(html) {
      const w = window.open('', '_blank');
      if (!w) {
        showDevWarning('Não foi possível abrir a janela de impressão. Verifique o bloqueador de pop-ups.');
        return;
      }
      w.document.open();
      w.document.write(html);
      w.document.close();
      w.focus();
      // Aguarda carregamento antes de pedir impressão
      w.onload = () => {
        try {
          w.print();
        } catch (err) {
          showDevWarning('Erro ao gerar impressão.');
        }
      };
    }

    const finalizeBtn = document.querySelector('.section-circumstances__actions .action-button.action-button--primary');
    if (finalizeBtn) {
      finalizeBtn.addEventListener('click', () => {
        // Recalcula e salva terceiro resultado
        updateThirdPhaseResult();
        // Cria e salva registro final no histórico
        const entry = createFinalHistoryEntry();
        const items = loadHistoryItems();
        items.unshift(entry);
        saveHistoryItems(items);
        showDevWarning('Relatório salvo no histórico. Preparando impressão...');
        // Gera PDF automaticamente (usa html2pdf se disponível)
        const pdfHtml = buildReportHtml(entry);
        if (window.html2pdf) {
          // Cria container temporário
          const container = document.createElement('div');
          container.style.position = 'fixed';
          container.style.left = '-9999px';
          container.innerHTML = pdfHtml;
          document.body.appendChild(container);
          const opt = {
            margin:       10,
            filename:     `relatorio-dosimetria-${Date.now()}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2 },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
          };
          window.html2pdf().set(opt).from(container).save().then(() => {
            document.body.removeChild(container);
            showDevWarning('PDF gerado e salvo pelo navegador.');
          }).catch(err => {
            document.body.removeChild(container);
            showDevWarning('Erro ao gerar PDF.');
            // fallback para impressão
            openPrintWindow(pdfHtml);
          });
        } else {
          // Fallback: abrir janela de impressão
          openPrintWindow(pdfHtml);
        }
      });
    }
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
  const warnSelectors = ['.footer__links a', '.historico-card__action', '.historico-card__delete', '.historico-filter-button'];
  document.querySelectorAll(warnSelectors.join(',')).forEach(el => {
    el.addEventListener('click', () => {
      showDevWarning('Este site ainda está em desenvolvimento');
    });
  });

  updateResultCard();
});
