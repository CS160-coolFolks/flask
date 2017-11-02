const addBtn = document.getElementById('add');
const deleteBtn = document.getElementById('delete');

function disableButtons() {
    addBtn.disabled = true;
    if (deleteBtn !== null) {
        deleteBtn.disabled = true;
    }
}

function main() {
    addBtn.addEventListener('click', () => requestAnimationFrame(() => {
        disableButtons();
        addThrobber(addBtn);
    }));

    if (deleteBtn !== null) {
        deleteBtn.addEventListener('click', () => requestAnimationFrame(() => {
            disableButtons();
            addThrobber(deleteBtn);
        }));
    }
}

main();
