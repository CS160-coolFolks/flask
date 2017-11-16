const addBtn = document.getElementById('add');
const deleteBtn = document.getElementById('delete');
const uploadInput = document.getElementById('upload');
const uploadText = document.getElementById('upload-text');

function displayFilename() {
    let filename = uploadInput.value;
    filename = filename.replace(/.*\\/, '');
    filename = filename.replace(/.*\//, '');

    uploadText.innerText = filename;
}

function disableButtons() {
    addBtn.disabled = true;
    if (deleteBtn !== null) {
        deleteBtn.disabled = true;
    }
}

function renderDates() {
    for (const span of document.querySelectorAll('span[data-date]')) {
        span.innerText = moment(parseInt(span.innerText.trim()) * 1000).fromNow();
    }
}

function main() {
    uploadInput.addEventListener('change', displayFilename);

    addBtn.addEventListener('click', () => requestAnimationFrame(() => {
        disableButtons();
        addThrobber(addBtn, 2);
    }));

    if (deleteBtn !== null) {
        deleteBtn.addEventListener('click', () => requestAnimationFrame(() => {
            disableButtons();
            addThrobber(deleteBtn, 2);
        }));
    }

    renderDates();
}

main();
