function addThrobber(el, leftMarginSize) {
    const throbber = document.createElement('span');
    throbber.classList.add('fa');
    throbber.classList.add('fa-spin');
    throbber.classList.add('fa-refresh');
    throbber.classList.add(`ml-${leftMarginSize}`);
    el.appendChild(throbber);
}

function removeThrobber(el) {
    for (const throbber of el.querySelectorAll('span.fa.fa-spin.fa-refresh')) {
        throbber.parentNode.removeChild(throbber);
    }
}
