import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('app-tabs')
export class AppTabs extends LitElement {
  @property() currentTab = 'dashboard';

  createRenderRoot() {
    return this; // Disable shadow DOM to use global Tailwind styles
  }

  private tabs = [
    { id: 'dashboard', label: 'Дашборд' },
    { id: 'weight', label: 'Вес' },
    { id: 'calories', label: 'Калории' },
    { id: 'history', label: 'История' },
    { id: 'export', label: 'Экспорт' },
  ];

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
          <button
            @click=${this.handleSettingsClick}
            class="text-white hover:text-gray-300 transition px-4 py-2"
          >
            Настройки
          </button>
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
