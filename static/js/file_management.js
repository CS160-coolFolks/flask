const addBtn = document.getElementById('add');
const deleteBtn = document.getElementById('delete');

function disableButtons() {
    addBtn.setAttribute("disabled", "");
    if (deleteBtn !== null) {
        deleteBtn.setAttribute("disabled", "");
    }
}

function addButtonThrobber(btn) {
}

function main() {
    addBtn.addEventListener('click', () => requestAnimationFrame(() => {
        disableButtons();
        addButtonThrobber(addBtn);
    }));

    if (deleteBtn !== null) {
        deleteBtn.addEventListener('click', () => requestAnimationFrame(() => {
            disableButtons();
            addButtonThrobber(deleteBtn);
        }));
    }
}

main();
