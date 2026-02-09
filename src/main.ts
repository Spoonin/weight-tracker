import "./style.css";
import "./components/app-root";

// Service Worker registration
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}
