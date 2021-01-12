export let html;
document.addEventListener("DOMContentLoaded", function () {
    html = {
        panel: document.querySelector("#console"),
        log: function (m) {
            var newline = document.createElement("div");
            newline.innerHTML = "&gt; " + JSON.stringify(m);
            this.panel.appendChild(newline);
        }
    };
});