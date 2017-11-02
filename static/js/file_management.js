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
}

main();
