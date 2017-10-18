const analyses = {};

let chartsShown = false;
let chartTimeline = null;
let chartProportionErrors = null;
let chartProportionPrincipals = null;


function parseDatetimeFilter(datetime) {
    return moment(datetime);
}

function formatDatetimeFilter(datetime) {
    return datetime.format('YYYY-MM-DD HH:mm:ss');
}

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
        if (parseDatetimeFilter(fromEl.value).isValid()) {
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
        if (parseDatetimeFilter(toEl.value).isValid()) {
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
    const chartsContainer = document.getElementById('charts');
    chartsContainer.style.display = '';

    const noData = {};

    chartTimeline = new Chartist.Bar('#chart-timeline', noData, {
        width: 900,
        height: 200
    });
    chartProportionErrors = new Chartist.Pie('#chart-proportion-errors', noData, {
        width: 200,
        height: 200,
        donut: true
    });
    chartProportionPrincipals = new Chartist.Pie('#chart-proportion-auth-principals', noData, {
        width: 200,
        height: 200
    });
}

function toMoment(error) {
    return moment(`${error[0]} ${error[1]}`, 'MMM DD HH:mm:ss');
}

function filterByTimespan(errorGroups, begin, end) {
    let predicate = _ => true;

    if (begin && end) {
        predicate = error => begin <= toMoment(error) && toMoment(error) <= end;
    } else if (begin && !end) {
        predicate = error => begin <= toMoment(error);
    } else if (!begin && end) {
        predicate = error => toMoment(error) <= end;
    }

    const remainingErrors = {};
    for (const type in errorGroups) {
        const remainingErrorList = errorGroups[type].filter(predicate);
        if (remainingErrorList.length > 0) {
            remainingErrors[type] = remainingErrorList;
        }
    }
    return remainingErrors;
}

function filterByChosenTimespan(errorGroups) {
    let begin = document.getElementById('from').value;
    let end = document.getElementById('to').value;

    if (begin !== '' && parseDatetimeFilter(begin).isValid()) {
        begin = parseDatetimeFilter(begin);
    } else {
        begin = null;
    }

    if (end !== '' && parseDatetimeFilter(end).isValid()) {
        end = parseDatetimeFilter(end);
    } else {
        end = null;
    }

    return filterByTimespan(errorGroups, begin, end);
}

function setCharts(analysis) {
    if (!chartsShown) {
        chartsShown = false;
        createCharts();
    }

    let errorGroups = analysis.error_groups;
    console.log(analysis);

    errorGroups = filterByChosenTimespan(errorGroups);

    setTimeInputHints(errorGroups);

    setTimelineChart(errorGroups);
    setProportionAuthPrincipalsChart(errorGroups);
    setProportionErrorsChart(errorGroups);
}

function flatten(arrayOfArrays) {
    return arrayOfArrays.reduce((a, b) => a.concat(b), []);
}

function min(a, b) {
    return a < b ? a : b;
}

function max(a, b) {
    return a < b ? b : a;
}

function minOf(array) {
    return array.reduce(min);
}

function maxOf(array) {
    return array.reduce(max);
}

function setTimeInputHints(errorGroups) {
    const errors = flatten(Object.values(errorGroups));
    const errorDates = errors.map(toMoment);

    document.getElementById('from').placeholder = formatDatetimeFilter(minOf(errorDates));
    document.getElementById('to').placeholder = formatDatetimeFilter(maxOf(errorDates));
}

function setTimelineChart(errorGroups) {
    const labels = Object.keys(errorGroups);
    const series = Object.values(errorGroups).map(errorList => errorList.length);
    chartTimeline.update({
        labels,
        series: [series]
    });
}

function setProportionErrorsChart(errorGroups) {
    const series = [];
    for (const type in errorGroups) {
        const errorList = errorGroups[type];
        series.push({
            value: errorList.length,
            type
        })
    }
    chartProportionErrors.update({
        series
    });
}

function setProportionAuthPrincipalsChart(errorGroups) {
}

function main() {
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
