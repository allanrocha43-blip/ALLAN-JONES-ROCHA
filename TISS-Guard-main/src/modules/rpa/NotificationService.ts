import { MESSAGES } from "../i18n/constants";

export const NotificationService = {
  showSuccessToast(filledCount: number) {
    const toast = document.createElement("div");
    toast.innerText = MESSAGES.RPA_SUCCESS(filledCount);
    Object.assign(toast.style, {
      position: "fixed",
      bottom: "20px",
      right: "20px",
      padding: "12px 24px",
      backgroundColor: "#0f172a",
      color: "white",
      borderLeft: "4px solid #22c55e",
      borderRadius: "8px",
      zIndex: "2147483647",
      boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
      fontFamily: "system-ui, sans-serif",
      fontSize: "14px",
      margin: "0",
    });
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
  },

  showFailurePanel(
    failures: { field: string; value: string; reason: string }[],
  ) {
    const panel = document.createElement("div");
    Object.assign(panel.style, {
      position: "fixed",
      bottom: "20px",
      right: "20px",
      width: "380px",
      backgroundColor: "#7f1d1d",
      color: "#fef2f2",
      borderRadius: "8px",
      zIndex: "2147483647",
      boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
      fontFamily: "system-ui, sans-serif",
      border: "1px solid #991b1b",
      padding: "20px",
      margin: "0",
      display: "flex",
      flexDirection: "column",
      gap: "12px",
      boxSizing: "border-box",
    });

    const title = document.createElement("h3");
    title.innerText = MESSAGES.RPA_WARNING_TITLE;
    Object.assign(title.style, {
      margin: "0",
      fontSize: "16px",
      fontWeight: "bold",
      lineHeight: "1.2",
      color: "#fecaca",
    });
    panel.appendChild(title);

    const subtitle = document.createElement("p");
    subtitle.innerText = MESSAGES.RPA_WARNING_SUBTITLE;
    Object.assign(subtitle.style, {
      margin: "0",
      fontSize: "14px",
      lineHeight: "1.4",
      color: "#fca5a5",
    });
    panel.appendChild(subtitle);

    const ul = document.createElement("ul");
    Object.assign(ul.style, {
      margin: "0",
      padding: "0 0 0 20px",
      fontSize: "13px",
      lineHeight: "1.5",
      color: "#fff",
      maxHeight: "150px",
      overflowY: "auto",
    });

    failures.forEach((f) => {
      const li = document.createElement("li");
      li.style.marginBottom = "4px";
      li.innerHTML = `<strong>${f.field}:</strong> ${f.value}`;
      ul.appendChild(li);
    });
    panel.appendChild(ul);

    const btn = document.createElement("button");
    btn.innerText = "Entendi / Fechar";
    Object.assign(btn.style, {
      marginTop: "8px",
      padding: "10px 16px",
      backgroundColor: "#b91c1c",
      color: "white",
      border: "none",
      borderRadius: "6px",
      cursor: "pointer",
      fontWeight: "bold",
      fontSize: "14px",
      fontFamily: "system-ui, sans-serif",
      transition: "background-color 0.2s",
    });
    btn.onmouseover = () => (btn.style.backgroundColor = "#dc2626");
    btn.onmouseout = () => (btn.style.backgroundColor = "#b91c1c");
    btn.onclick = () => panel.remove();
    panel.appendChild(btn);

    document.body.appendChild(panel);
  },
};
