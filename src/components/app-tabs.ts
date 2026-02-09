import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

@customElement('app-tabs')
export class AppTabs extends LitElement {
  @property() currentTab = 'dashboard';
  @state() private menuOpen = false;

  createRenderRoot() {
    return this; // Disable shadow DOM to use global Tailwind styles
  }

  private tabs = [
    { id: 'dashboard', label: '📊 Дашборд' },
    { id: 'weight', label: '🏋️ Вес' },
    { id: 'calories', label: '🍽️ Калории' },
  ];

  private menuItems = [
    { id: 'history', label: '📋 История' },
    { id: 'export', label: '📦 Экспорт' },
    { id: 'settings', label: '⚙️ Настройки' },
  ];

  connectedCallback() {
    super.connectedCallback();
    this._onDocClick = this._onDocClick.bind(this);
    document.addEventListener('click', this._onDocClick);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('click', this._onDocClick);
  }

  private _onDocClick(e: Event) {
    if (this.menuOpen && !(e.target as HTMLElement).closest('.gear-menu')) {
      this.menuOpen = false;
    }
  }

  private handleTabClick(tabId: string) {
    this.dispatchEvent(new CustomEvent('tab-change', {
      detail: { tab: tabId },
      bubbles: true,
      composed: true,
    }));
  }

  private handleSettingsClick() {
    this.dispatchEvent(new CustomEvent('settings-open', {
      bubbles: true,
      composed: true,
    }));
  }

  private handleMenuItemClick(id: string) {
    this.menuOpen = false;
    if (id === 'settings') {
      this.handleSettingsClick();
    } else {
      this.handleTabClick(id);
    }
  }

  private toggleMenu(e: Event) {
    e.stopPropagation();
    this.menuOpen = !this.menuOpen;
  }

  render() {
    return html`
      <div class="glass rounded-2xl p-4 mb-6 fade-in">
        <div class="flex flex-wrap gap-2 items-center justify-between">
          <div class="flex flex-wrap gap-2">
            ${this.tabs.map(tab => html`
              <div 
                class="nav-tab ${this.currentTab === tab.id ? 'active' : ''}"
                @click=${() => this.handleTabClick(tab.id)}
              >
                ${tab.label}
              </div>
            `)}
          </div>
          <div class="relative gear-menu">
            <button
              @click=${this.toggleMenu}
              class="text-white hover:text-gray-300 transition p-2 rounded-lg hover:bg-white/10"
              title="Меню"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            ${this.menuOpen ? html`
              <div class="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50 overflow-hidden">
                ${this.menuItems.map(item => html`
                  <button
                    class="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors
                      ${(item.id === 'history' || item.id === 'export') && this.currentTab === item.id ? 'bg-indigo-50 text-indigo-700 font-medium' : ''}"
                    @click=${() => this.handleMenuItemClick(item.id)}
                  >
                    ${item.label}
                  </button>
                `)}
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'app-tabs': AppTabs;
  }
}
