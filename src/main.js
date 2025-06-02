import "./style.css";

function getBaseUrl() {
    // Get the repository name from the pathname (will be empty locally)
    const pathParts = window.location.pathname.split('/');
    let repoName = '';

    // Check if we're on GitHub Pages
    if (window.location.hostname.includes('github.io')) {
        // The repository name is the first path segment after the domain on GitHub Pages
        repoName = pathParts[1];
        return window.location.origin + '/' + repoName + '/';
    } else {
        // Local development
        return window.location.origin + '/';
    }
}

const baseUrl = getBaseUrl();
console.log('haha url', baseUrl);

document.getElementById("task1Btn").addEventListener("click", () => {
    window.location.href = baseUrl
        + "src/task1.html";
});

document.getElementById("task2Btn").addEventListener("click", () => {
    window.location.href = baseUrl
        + "/src/task2.html";
});

document.getElementById("task3Btn").addEventListener("click", () => {
    window.location.href = baseUrl
        + "/src/task3.html";
});

document.getElementById("task4Btn").addEventListener("click", () => {
    window.location.href = baseUrl
        + "/src/task4.html";ç
});