const analyses = {};

function getRadioButtonValue(name) {
    const buttons = document.getElementsByName(name);

    for (const button of buttons) {
        if (button.checked) {
            return button.value;
        }
    }

    return null;
}

function isRadioButtonSelected(name) {
    return getRadioButtonValue(name) !== null;
}

function fetchAnalysis(logId) {
    if (analyses[logId] === undefined) {
        analyses[logId] = fetch(`/error_analysis/data/${logId}.json`, {credentials: 'include'})
            .then(response => response.json());
    }

    return analyses[logId];
}

async function onFileChange() {
    const logId = getRadioButtonValue('file');

    const analysis = await fetchAnalysis(logId);

    setCharts(analysis);
}

function createCharts() {
}

function setCharts(analysis) {
    console.log('setCharts');
    console.log(analysis);
}

function main() {
    createCharts();

    // Did a log file start out selected?
    if (isRadioButtonSelected('file')) {
        onFileChange();
    }

    // Listen for future selection changes.
    for (const radioButton of document.getElementsByName('file')) {
        radioButton.addEventListener('change', onFileChange);
    }
}

main();
