document.addEventListener("DOMContentLoaded", () => {
    loadComponent(".nav-container", "components/nav.html");
    loadComponent(".footer", "components/footer.html");
});

function loadComponent(selector, file) {
    fetch(file)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to load ${file}`);
            }
            return response.text();
        })
        .then(data => {
            document.querySelector(selector).innerHTML = data;
        })
        .catch(error => {
            console.error(error);
        });
}