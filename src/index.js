import React from "react";
import ReactDOM from "react-dom/client";
import BirthdayApp from "./birthday-app";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<BirthdayApp />);

// Register Service Worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js");
  });
}
