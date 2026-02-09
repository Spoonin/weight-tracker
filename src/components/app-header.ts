import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { store } from '../store';
import { formatDateFull } from '../utils';

@customElement('app-header')
export class AppHeader extends LitElement {
  @state() private goalText = '';

  createRenderRoot() {
    return this; // Disable shadow DOM to use global Tailwind styles
  }

  connectedCallback() {
    super.connectedCallback();
    this.updateGoalText();
  }

  private updateGoalText() {
    const c = store.config;
    if (c) {
      this.goalText = `Путь к цели: ${c.startWeight} кг → ${c.targetWeight} кг до ${formatDateFull(c.endDate)}`;
    }
  }

  render() {
    return html`
      <div class="glass rounded-2xl p-6 md:p-8 mb-6 fade-in">
        <h1 class="text-3xl md:text-4xl font-bold text-white mb-2">
          Трекер Веса и Калорий
        </h1>
        <p class="text-gray-300">${this.goalText}</p>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'app-header': AppHeader;
  }
}
