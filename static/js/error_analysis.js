const analyses = {};

let chartTimeline = null;
let chartProportionErrors = null;
let chartProportionPrincipals = null;


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

async function onTimespanChange() {
    updateTimespanAppearance();

    const logId = getRadioButtonValue('file');

    if (logId !== null) {
        const analysis = await fetchAnalysis(logId);
        setCharts(analysis);
    }
}

// Show & hide error message & valid/invalid class on from/to <input> elements.
function updateTimespanAppearance() {
    const fromEl = document.getElementById('from');
    const toEl = document.getElementById('to');
    const fromFeedback = document.getElementById('from-feedback');
    const toFeedback = document.getElementById('to-feedback');

    if (fromEl.value !== '') {
        if (moment(fromEl.value).isValid()) {
            fromEl.classList.add('is-valid');
            fromEl.classList.remove('is-invalid');
            fromFeedback.style.display = 'none';
        } else {
            fromEl.classList.remove('is-valid');
            fromEl.classList.add('is-invalid');
            fromFeedback.style.display = 'block';
        }
    } else {
        fromEl.classList.remove('is-valid');
        fromEl.classList.remove('is-invalid');
        fromFeedback.style.display = 'none';
    }

    if (toEl.value !== '') {
        if (moment(toEl.value).isValid()) {
            toEl.classList.add('is-valid');
            toEl.classList.remove('is-invalid');
            toFeedback.style.display = 'none';
        } else {
            toEl.classList.remove('is-valid');
            toEl.classList.add('is-invalid');
            toFeedback.style.display = 'block';
        }
    } else {
        toEl.classList.remove('is-valid');
        toEl.classList.remove('is-invalid');
        toFeedback.style.display = 'none';
    }
}

function createCharts() {
    chartTimeline = new Chartist.Bar('#chart-timeline', {
        labels: ['a', 'b'],
        series: [[1, 2]]
    }, {
        width: 900,
        height: 200
    });
    chartProportionErrors = new Chartist.Pie('#chart-proportion-errors', {
        series: [1, 2]
    }, {
        width: 200,
        height: 200,
        donut: true
    });
    chartProportionPrincipals = new Chartist.Pie('#chart-proportion-auth-principals', {
        series: [1, 2]
    }, {
        width: 200,
        height: 200
    });
}

function filterByTimespan(errors, begin, end) {
    let filter = _ => true;

    if (begin && end) {
        filter = error => begin <= moment(error.date) && moment(error.date) <= end;
    } else if (begin && !end) {
        filter = error => begin <= moment(error.date);
    } else if (!begin && end) {
        filter = error => moment(error.date) <= end;
    }

    const remainingErrors = {};
    for (const type in errors) {
        const remainingErrorList = filter(errors[type]);
        if (remainingErrorList.length > 0) {
            remainingErrors[type] = remainingErrorList;
        }
    }
    return remainingErrors;
}

function filterByChosenTimespan(errors) {
    let begin = document.getElementById('from').value;
    let end = document.getElementById('to').value;

    if (begin !== '' && moment(begin).isValid() === true) {
        begin = moment(begin);
    } else {
        begin = null;
    }

    if (end !== '' && moment(end).isValid() === true) {
        end = moment(end);
    } else {
        end = null;
    }

    return filterByTimespan(errors, begin, end);
}

function setCharts(analysis) {
    console.log(analysis);

    let knownErrors = analysis.known_errors;

    knownErrors = filterByChosenTimespan(knownErrors);
    console.log(knownErrors);

    setTimelineChart(knownErrors);
    setProportionAuthPrincipalsChart(knownErrors);
    setProportionErrorsChart(knownErrors);
}

function setTimelineChart(errors) {
    const labels = Object.keys(errors);
    const series = Object.values(errors).map(errorList => errorList.length);
    chartTimeline.update({
        labels,
        series: [series]
    });
}

function setProportionErrorsChart(errors) {
    const series = [];
    for (const type in errors) {
        const errorList = errors[type];
        series.push({
            value: errorList.length,
            type
        })
    }
    chartProportionErrors.update({
        series
    });
}

function setProportionAuthPrincipalsChart(errors) {
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

    const fromEl = document.getElementById('from');
    const toEl = document.getElementById('to');

    fromEl.addEventListener('change', onTimespanChange);
    toEl.addEventListener('change', onTimespanChange);
}

main();
