(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('../../print-sections.js'), require('../models/consultation-guide-model.js'));
  } else {
    root.CoverageFitPrintSections = root.CoverageFitPrintSections || {};
    root.CoverageFitPrintSections['consultation-guide'] = factory(root.CoverageFitPrintSectionRegistry, root.CoverageFitConsultationGuideModel);
  }
})(typeof window !== 'undefined' ? window : globalThis, function (registry, guideModel) {
  'use strict';
  if (!guideModel || typeof guideModel.create !== 'function') throw new Error('CoverageFit Consultation Guide Model is required.');

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }
  function formatDate(value) {
    if (!value) return 'Not scheduled';
    const date = new Date(`${value}T12:00:00`);
    if (Number.isNaN(date.getTime())) return escapeHtml(value);
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
  }
  function renderConfirm(items) {
    const values = Array.isArray(items) ? items.filter(Boolean) : [];
    if (!values.length) return '<li>Current limits, deductibles, endorsements, exclusions, and customer preference.</li>';
    return values.map(item => `<li>${escapeHtml(item)}</li>`).join('');
  }
  function renderHandoffList(items, emptyMessage, kind) {
    const values = Array.isArray(items) ? items.filter(Boolean) : [];
    if (!values.length) return `<li class="cf-guide-evidence__empty">${escapeHtml(emptyMessage)}</li>`;
    return values.map(item => {
      const detail = kind === 'confirmed' ? (item.answer || item.statement) : (item.question || item.answer || item.statement);
      return `<li><strong>${escapeHtml(item.title)}</strong>${detail ? `<span>${escapeHtml(detail)}</span>` : ''}</li>`;
    }).join('');
  }
  function renderEvidenceHandoff(handoff) {
    const source = handoff || {};
    const summary = source.summary || {};
    if (!source.available) {
      return `<section class="cf-guide-evidence cf-guide-evidence--legacy" aria-label="Assessment evidence handoff"><div class="cf-guide-evidence__heading"><span>Assessment evidence</span><strong>Legacy review</strong></div><p>This record predates evidence-quality handoff. Confirm the saved answers manually before relying on them.</p></section>`;
    }
    return `<section class="cf-guide-evidence" aria-labelledby="cf-guide-evidence-title">
      <div class="cf-guide-evidence__heading"><div><span>Assessment evidence</span><h2 id="cf-guide-evidence-title">What is confirmed, what must be verified, and what remains open</h2></div><strong>${Number(summary.confirmed || 0)} confirmed · ${Number(summary.followUp || 0)} follow-up</strong></div>
      <div class="cf-guide-evidence__grid">
        <section><h3>Confirmed facts</h3><ul>${renderHandoffList(source.confirmedFacts, 'No confirmed facts carried forward.', 'confirmed')}</ul></section>
        <section><h3>Verify against policy</h3><ul>${renderHandoffList(source.verificationItems, 'No policy-verification items identified.', 'verification')}</ul></section>
        <section><h3>Unresolved questions</h3><ul>${renderHandoffList(source.unresolvedQuestions, 'No unresolved questions identified.', 'unresolved')}</ul></section>
      </div>
      <p class="cf-guide-evidence__guardrail">${escapeHtml(source.guardrail)}</p>
    </section>`;
  }

  function renderTopic(topic) {
    return `<article class="cf-guide-topic" data-topic-id="${escapeHtml(topic.id)}" data-evidence-quality="${escapeHtml(topic.evidenceQuality || 'confirmed')}">
      <header class="cf-guide-topic__header">
        <span class="cf-guide-topic__number">${String(topic.order).padStart(2, '0')}</span>
        <div><p>${escapeHtml(topic.priority)}${topic.category ? ` · ${escapeHtml(topic.category)}` : ''}<em class="cf-guide-topic__evidence">${escapeHtml(topic.evidenceLabel || 'Clear response captured')}</em></p><h2>${escapeHtml(topic.title)}</h2></div>
      </header>
      <div class="cf-guide-topic__grid">
        <section><span>What was discovered</span><p>${escapeHtml(topic.discovered)}</p></section>
        <section><span>Question to ask</span><p class="cf-guide-question">${escapeHtml(topic.question)}</p></section>
        <section><span>Recommended direction</span><p>${escapeHtml(topic.direction)}</p></section>
        <section><span>Information to confirm</span><ul>${renderConfirm(topic.confirm)}</ul></section>
      </div>
    </article>`;
  }
  function renderDecisions(items) {
    const values = Array.isArray(items) ? items.filter(Boolean) : [];
    if (values.length) return `<ul class="cf-guide-decision-list">${values.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
    return '<div class="cf-guide-writing-lines" aria-label="Space for coverage decisions"><span></span><span></span><span></span></div>';
  }

  const section = Object.freeze({
    id: 'consultation-guide',
    name: 'Consultation Guide',
    version: '1.0.0',
    order: 30,
    requiredPaths: Object.freeze(['consultationContext', 'recommendations']),
    createModel(model) { return guideModel.create(model); },
    shouldRender(model) { return guideModel.hasContent(this.createModel(model)); },
    emptyState: Object.freeze({ message: 'No consultation guide is available.' }),
    render(model) {
      const m = this.createModel(model);
      const contact = [m.customer.phone, m.customer.email].filter(Boolean).join(' · ') || 'Contact not provided';
      const topics = m.topics.map(renderTopic).join('');
      const followUp = m.followUp.state === 'scheduled'
        ? `${formatDate(m.followUp.dueDate)}${m.followUp.note ? ` · ${escapeHtml(m.followUp.note)}` : ''}`
        : 'Not yet scheduled';
      const html = `<section class="cf-print-section cf-consultation-guide" aria-labelledby="cf-guide-title">
        <header class="cf-guide-header">
          <div><p class="cf-guide-eyebrow">Agent Working Document</p><h1 id="cf-guide-title">Coverage Conversation Guide</h1><p>${escapeHtml(m.customer.name)} · ${escapeHtml(m.propertyAddress || 'Property address not available')}</p></div>
          <div class="cf-guide-brand">CoverageFit<span>®</span><small>Consultation guide</small></div>
        </header>
        <section class="cf-guide-context" aria-label="Consultation context">
          <div><span>Review reason</span><strong>${escapeHtml(m.reviewReason)}</strong></div>
          <div><span>Customer contact</span><strong>${escapeHtml(contact)}</strong></div>
          <div><span>Workflow stage</span><strong>${escapeHtml(m.stage)}</strong></div>
          <div><span>Follow-up</span><strong>${followUp}</strong></div>
        </section>
        ${renderEvidenceHandoff(m.evidenceHandoff)}
        <div class="cf-guide-topics">${topics || '<p class="cf-guide-empty">No recommendation topics were captured. Use the blank decision fields below to document the consultation.</p>'}</div>
        <section class="cf-guide-close" aria-labelledby="cf-guide-close-title">
          <div class="cf-guide-close__heading"><span>Close the consultation</span><h2 id="cf-guide-close-title">Decisions and next action</h2></div>
          <div class="cf-guide-close__grid">
            <section><h3>Coverage decisions / proposal structure</h3>${renderDecisions(m.decisions)}</section>
            <section><h3>Open underwriting or information items</h3>${m.missingInformation.length ? `<ul class="cf-guide-decision-list">${m.missingInformation.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : '<div class="cf-guide-writing-lines"><span></span><span></span><span></span></div>'}</section>
            <section class="cf-guide-next-action"><h3>Next action</h3><p>${escapeHtml(m.nextAction || 'Document the agreed next step, owner, and follow-up date.')}</p><div class="cf-guide-writing-lines"><span></span><span></span></div></section>
          </div>
        </section>
        <footer class="cf-guide-footer"><p><strong>Use:</strong> Guide the licensed consultation and document decisions. Confirm all coverage against the issued policy and carrier underwriting.</p><p>CoverageFit · Virginia Tam Insurance Agency · Confidential</p><strong class="cf-document-page">Page 3 of 3</strong></footer>
      </section>`;
      return Object.freeze({ id: this.id, html, model: m, diagnostics: guideModel.getDiagnostics(m) });
    }
  });

  if (registry && typeof registry.registerSection === 'function') registry.registerSection(section.id, section, { replace: true });
  return section;
});
