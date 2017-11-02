const addBtn = document.getElementById('add');
const deleteBtn = document.getElementById('delete');

function disableButtons() {
    addBtn.disabled = true;
    if (deleteBtn !== null) {
        deleteBtn.disabled = true;
    }
}

function addButtonThrobber(btn) {
    const throbber = document.createElement('span');
    throbber.classList.add('fa');
    throbber.classList.add('fa-spin');
    throbber.classList.add('fa-refresh');
    throbber.classList.add('ml-2');
    btn.appendChild(throbber);
}

function main() {
    addBtn.addEventListener('click', (e) => requestAnimationFrame(() => {
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
