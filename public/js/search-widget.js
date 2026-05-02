/**
 * SearchWidget — reusable debounced search bar
 *
 * Usage:
 *   const sw = new SearchWidget({
 *     containerId:   'my-container',
 *     placeholder:   'Search…',
 *     apiUrl:        '/reviewee/api/search',
 *     defaultParams: { scope: 'materials' },
 *     onResults:  (results, query) => render(results),
 *     onClear:    ()               => restoreAll(),
 *     debounceMs: 300,
 *   });
 *   sw.mount();
 *
 *   // Sync active filter chips → re-searches if a query is active:
 *   sw.setParams({ domain: 'Verbal Ability', type: 'Drill Set' });
 *
 *   // Read current text (decide client vs server filter in chip handlers):
 *   const q = sw.getValue();
 */
class SearchWidget {
  constructor(opts = {}) {
    this._containerId   = opts.containerId;
    this._placeholder   = opts.placeholder   || 'Search\u2026';
    this._apiUrl        = opts.apiUrl;
    this._defaultParams = { ...(opts.defaultParams || {}) };
    this._extraParams   = {};
    this._onResults     = opts.onResults     || (() => {});
    this._onClear       = opts.onClear       || (() => {});
    this._debounceMs    = opts.debounceMs    != null ? opts.debounceMs : 300;
    this._timer         = null;
    this._activeQuery   = '';
    this._input         = null;
    this._clearBtn      = null;
  }

  mount() {
    const container = document.getElementById(this._containerId);
    if (!container) return;

    container.innerHTML =
      '<div class="sw-wrap">' +
      '<span class="sw-icon">' +
        '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' +
          '<circle cx="11" cy="11" r="8"/>' +
          '<line x1="21" y1="21" x2="16.65" y2="16.65"/>' +
        '</svg>' +
      '</span>' +
      '<input class="sw-input" type="text" placeholder="' + this._placeholder + '" autocomplete="off" spellcheck="false"/>' +
      '<button class="sw-clear" aria-label="Clear search" title="Clear" hidden>' +
        '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">' +
          '<line x1="18" y1="6" x2="6" y2="18"/>' +
          '<line x1="6" y1="6" x2="18" y2="18"/>' +
        '</svg>' +
      '</button>' +
      '</div>';

    this._input    = container.querySelector('.sw-input');
    this._clearBtn = container.querySelector('.sw-clear');

    this._input.addEventListener('input', () => {
      const val = this._input.value;
      this._clearBtn.hidden = !val;
      clearTimeout(this._timer);
      this._timer = setTimeout(() => this._run(val.trim()), this._debounceMs);
    });

    this._clearBtn.addEventListener('click', () => {
      this._input.value = '';
      this._clearBtn.hidden = true;
      clearTimeout(this._timer);
      this._activeQuery = '';
      this._onClear();
    });
  }

  /**
   * Update extra URL params (e.g. from filter chips).
   * Triggers a fresh server fetch if a query is currently active.
   */
  setParams(params) {
    this._extraParams = { ...this._extraParams, ...params };
    if (this._activeQuery) this._run(this._activeQuery);
  }

  /** Returns the current raw input value. */
  getValue() {
    return this._input ? this._input.value : '';
  }

  async _run(query) {
    this._activeQuery = query;
    if (!query) { this._onClear(); return; }

    const params = new URLSearchParams({
      ...this._defaultParams,
      ...this._extraParams,
      q: query,
    });

    try {
      const r = await fetch(this._apiUrl + '?' + params);
      if (!r.ok) return;
      const data = await r.json();
      this._onResults(data.results || [], query);
    } catch (_) {}
  }
}
