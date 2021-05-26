let Resize = function (elementToResize, elementForResizing, direction) {

    let self = this;
    this.elementToResize = elementToResize;
    this.resizingBtn = elementForResizing;
    this.direction = direction;
    this.resizing = false;
    this.rect = 0;
    this.resizingBtn.addEventListener('mousedown', begin);
    this.initialX, this.initialY, this.initialWidth, this.initialHeight;

    function begin (e) {
        self.resizing = true;
        self.initialX = e.clientX;
        self.initialY = e.clientY;
        self.initialWidth = parseInt(document.defaultView.getComputedStyle(elementToResize).width, 10);
        self.initialHeight = parseInt(document.defaultView.getComputedStyle(elementToResize).height, 10);
        window.addEventListener('mousemove', resize);
        window.addEventListener('mouseup', end);
    }
    function resize (e) {
        e.preventDefault();
        if (self.resizing) {
            if (self.direction == "width") {
                self.elementToResize.style.width = (self.initialWidth + e.clientX - self.initialX) + 'px';
            }
            if (self.direction == "height") {
                self.elementToResize.style.height = (self.initialHeight + e.clientY - self.initialY) + 'px';
            }
        }
    }
    function end () {
        self.resizing = false;
        window.removeEventListener('mousemove', resize);
        window.removeEventListener('mouseup', end);
    }

};
new Resize(document.getElementById("left-panel"), document.getElementById("left-panel-resize"), "width");
new Resize(document.getElementById("threads-list"), document.getElementById("thread-content-resize"), "height");
new Resize(document.getElementById("th-subject"), document.getElementById("subject-resize"), "width");
new Resize(document.getElementById("th-correspondent"), document.getElementById("correspondent-resize"), "width");
new Resize(document.getElementById("th-state"), document.getElementById("state-resize"), "width");

const Search = {
    init: function () {
        this.threads = Array.from(document.getElementsByClassName("thread-summary"));
        this.searchInput = document.getElementById("search-input");
        this.searchInput.addEventListener("keyup", this.search);
    },

    search: function () {
        let searchValue = Search.searchInput.value.toLowerCase();
        Search.threads.forEach((thread) => {
            let subject = thread.childNodes[3].textContent.toLowerCase();
            let correspondents = thread.childNodes[5].textContent.toLowerCase();
            if (subject.indexOf(searchValue) === -1 && correspondents.indexOf(searchValue) === -1) thread.classList.add("off");
            else thread.classList.remove("off");
        });
    }

};

let switchLightDark = document.getElementById("switch-light-dark");
let light = true;
switchLightDark.addEventListener("click", (e) => {
    e.preventDefault();

    let buttons = Array.from(document.querySelectorAll("button"));
    let main = document.querySelector("#main");
    let threadActions = document.querySelector("#thread-actions");
    let searchInput = document.getElementById('search-input');

    if (light) {
        // switch to dark mode
        light = false;
        switchLightDark.innerHTML = "Switch to Light Mode";

        main.classList.add("dark-background");

        threadActions.classList.remove("light-background");
        threadActions.classList.add("darker-background");

        searchInput.classList.remove("light-input");
        searchInput.classList.add("dark-input");

        buttons.forEach((element) => {
            element.classList.remove("light-button");
            element.classList.add("dark-button");
        });
    } else {
        // switch to light mode
        light = true;
        switchLightDark.innerHTML = "Switch to Dark Mode";

        main.classList.remove("dark-background");

        threadActions.classList.remove("darker-background");
        threadActions.classList.add("light-background");

        searchInput.classList.remove("dark-input");
        searchInput.classList.add("light-input");

        buttons.forEach((element) => {
            element.classList.remove("dark-button");
            element.classList.add("light-button");
        });
    }
});