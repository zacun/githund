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

// Most of ResizeTable code comes from https://webdevtrick.com/resizable-table-columns/
// Makes resizing columns from threads list less buggy than with Resize()
let ResizeTable = {
    min: 125,
    max: {
        "text-long": 3.33,
        "text-short": 1.67,
    },
    table: document.querySelector(".table"),
    cols: [],
    thBeingResized: null,

    begin: ({ target }) => {
        ResizeTable.thBeingResized = target.parentNode;
        window.addEventListener("mousemove", ResizeTable.resize);
        window.addEventListener("mouseup", ResizeTable.end);
    },

    resize: (e) => {
        e.preventDefault();
        let scrollOffsetX = document.documentElement.scrollLeft;
        let width = scrollOffsetX + e.clientX - ResizeTable.thBeingResized.offsetLeft;

        let col = ResizeTable.cols.find(({ th }) => th === ResizeTable.thBeingResized);
        col.size = Math.max(ResizeTable.min, width) + "px";

        ResizeTable.cols.forEach((col) => {
            if (col.size.startsWith("minmax")) col.size = parseInt(col.th.clientWidth, 10) + "px";
        });

        ResizeTable.table.style.gridTemplateColumns = 
            ResizeTable.cols.map(({header, size}) => size).join(" ");
    },

    end: () => {
        window.removeEventListener("mousemove", ResizeTable.resize);
        window.removeEventListener("mouseup", ResizeTable.end);
        ResizeTable.thBeingResized = null;
    }

}
document.querySelectorAll("th").forEach((th) => {
    let max = ResizeTable.max[th.dataset.type] + "fr";
    ResizeTable.cols.push({
        th,
        size: `minmax(${ResizeTable.min}px, ${max})`,
    });
    th.querySelector(".resize").addEventListener("mousedown", ResizeTable.begin);
});

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
let lightMode = true;
switchLightDark.addEventListener("click", (e) => {
    e.preventDefault();

    let buttons = Array.from(document.querySelectorAll("button"));
    let main = document.querySelector("#main");
    let threadActions = document.querySelector("#thread-actions");
    let searchInput = document.getElementById('search-input');
    let threadMessagesContent = document.getElementById("thread-messages-content");

    if (lightMode) {
        // switch to dark mode
        lightMode = false;
        switchLightDark.innerHTML = "Switch to Light Mode";

        main.classList.add("dark-background");

        threadActions.classList.remove("light-background");
        threadActions.classList.add("darker-background");

        threadMessagesContent.classList.remove("lighter-background");
        threadMessagesContent.classList.add("darker-background");

        searchInput.classList.remove("light-input");
        searchInput.classList.add("dark-input");

        buttons.forEach((element) => {
            element.classList.remove("light-button");
            element.classList.add("dark-button");
        });
    } else {
        // switch to light mode
        lightMode = true;
        switchLightDark.innerHTML = "Switch to Dark Mode";

        main.classList.remove("dark-background");

        threadActions.classList.remove("darker-background");
        threadActions.classList.add("light-background");

        threadMessagesContent.classList.remove("darker-background");
        threadMessagesContent.classList.add("lighter-background");

        searchInput.classList.remove("dark-input");
        searchInput.classList.add("light-input");

        buttons.forEach((element) => {
            element.classList.remove("dark-button");
            element.classList.add("light-button");
        });
    }
});