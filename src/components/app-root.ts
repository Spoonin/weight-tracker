import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { store } from '../store';
import './settings-modal';
import './onboarding-modal';
import './app-header';
import './app-tabs';
import './dashboard-tab';
import './weight-tab';
import './calories-tab';
import './history-tab';
import './export-tab';

@customElement('app-root')
export class AppRoot extends LitElement {
  @state() private currentTab = 'dashboard';
  @state() private showSettings = false;
  @state() private showOnboarding = false;

  createRenderRoot() {
    return this; // Disable shadow DOM to use global Tailwind styles
  }

  connectedCallback() {
    super.connectedCallback();
    if (!store.config) {
      this.showOnboarding = true;
    }
  }

  private handleTabChange(e: CustomEvent) {
    this.currentTab = e.detail.tab;
  }

  private handleSettingsOpen() {
    this.showSettings = true;
  }

  private handleSettingsClose() {
    this.showSettings = false;
  }

  private handleOnboardingComplete() {
    this.showOnboarding = false;
    this.requestUpdate();
  }

  render() {
    return html`
      ${this.showSettings
        ? html`<settings-modal @close=${this.handleSettingsClose}></settings-modal>`
        : ''}
      
      ${this.showOnboarding
        ? html`<onboarding-modal @complete=${this.handleOnboardingComplete}></onboarding-modal>`
        : ''}

      <div class="max-w-7xl mx-auto">
        <app-header></app-header>
        
        <app-tabs 
          .currentTab=${this.currentTab}
          @tab-change=${this.handleTabChange}
          @settings-open=${this.handleSettingsOpen}
        ></app-tabs>

        ${this.currentTab === 'dashboard' ? html`<dashboard-tab></dashboard-tab>` : ''}
        ${this.currentTab === 'weight' ? html`<weight-tab></weight-tab>` : ''}
        ${this.currentTab === 'calories' ? html`<calories-tab></calories-tab>` : ''}
        ${this.currentTab === 'history' ? html`<history-tab></history-tab>` : ''}
        ${this.currentTab === 'export' ? html`<export-tab></export-tab>` : ''}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'app-root': AppRoot;
  }
}
