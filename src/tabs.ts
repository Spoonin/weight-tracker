import { $ } from "./utils";

export function initTabs() {
  $("nav-tabs").addEventListener("click", (e) => {
    const target = (e.target as HTMLElement).closest<HTMLElement>("[data-tab]");
    if (!target) return;

    const tabName = target.dataset.tab!;

    document
      .querySelectorAll<HTMLElement>("[id$='-tab']")
      .forEach((tab) => tab.classList.add("hidden"));
    $(tabName + "-tab").classList.remove("hidden");

    document
      .querySelectorAll(".nav-tab")
      .forEach((nav) => nav.classList.remove("active"));
    target.classList.add("active");
  });
}
