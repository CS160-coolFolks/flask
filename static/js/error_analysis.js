let currentLogId = null;
const analyses = {};
let analysisLoading = true;
let analysis = null;
let errorGroups = null;

let chartsCreated = false;
let tableDetailsShown = false;
let chartTimeline = null;
let chartProportionErrors = null;
let chartProportionPrincipals = null;

let rerendering = false;


//
// Utility
//

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

function toMoment(error) {
    return moment(`${error[0]} ${error[1]}`, 'MMM DD HH:mm:ss');
}


//
// Render
//

function renderThrobber() {
    const throbber = document.getElementById('throbber');
    if (analysisLoading) {
        throbber.classList.remove('d-none');
    } else {
        throbber.classList.add('d-none');
    }
}

function formatDatetimeFilter(datetime) {
    return datetime.format('YYYY-MM-DD HH:mm:ss');
}

function renderTimes() {
    const fromEl = document.getElementById('from');
    const toEl = document.getElementById('to');
    const fromFeedback = document.getElementById('from-feedback');
    const toFeedback = document.getElementById('to-feedback');

    if (analysis === null) {
        fromEl.placeholder = 'Start time';
        toEl.placeholder = 'End time';
    } else {
        const errorGroups = analysis.error_groups;
        const errors = flatten(Object.values(errorGroups));
        const errorDates = errors.map(toMoment);

        fromEl.placeholder = formatDatetimeFilter(minOf(errorDates));
        toEl.placeholder = formatDatetimeFilter(maxOf(errorDates));
    }

    // Show & hide error message & valid/invalid class on from/to <input> elements.
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

function renderControls() {
    renderThrobber();
    renderTimes();
}

function clearTable() {
    const tbody = document.getElementById('tbody');
    while (tbody.firstChild) {
        tbody.removeChild(tbody.firstChild);
    }
}

function renderTableSmallRow(name, numOccurrences) {
    const nameEl = document.createElement('td');
    nameEl.appendChild(document.createTextNode(name));
    nameEl.classList.add('pr-3');

    const numEl = document.createElement('td');
    numEl.appendChild(document.createTextNode(numOccurrences));

    const tr = document.createElement('tr');
    tr.appendChild(nameEl);
    tr.appendChild(numEl);

    const tbody = document.getElementById('tbody');
    tbody.appendChild(tr);
}

function renderTableSmallBody() {
    for (const name in errorGroups) {
        const numOccurrences = errorGroups[name].length;
        renderTableSmallRow(name, numOccurrences);
    }
}

function renderTableLargeMainRow(name, numOccurrences, firstRow) {
    console.log(`firstRow ${firstRow}`);
}

function renderTableLargeSubRow(row) {
}

function renderTableLargeBody() {
    for (const name in errorGroups) {
        const errorGroup = errorGroups[name];
        const numOccurrences = errorGroup.length;
        renderTableLargeMainRow(name, numOccurrences, errorGroup[0]);
        for (let i = 0; i < numOccurrences - 1; i++) {
            renderTableLargeSubRow(errorGroup[i]);
        }
    }
}

function renderTable() {
    clearTable();
    if (tableDetailsShown) {
        renderTableLargeBody();
    } else {
        renderTableSmallBody();
    }
}

function createCharts() {
    const chartsContainer = document.getElementById('charts');

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

function renderTimelineChart() {
    const labels = Object.keys(errorGroups);
    const series = Object.values(errorGroups).map(errorList => errorList.length);
    chartTimeline.update({
        labels,
        series: [series]
    });
}

function renderProportionErrorsChart() {
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

function renderProportionAuthPrincipalsChart() {
}

function renderCharts() {
    const chartsContainer = document.getElementById('charts');

    if (analysis === null) {
        chartsContainer.classList.add('d-none');
        return;
    }

    chartsContainer.classList.remove('d-none');

    if (!chartsCreated) {
        chartsCreated = true;
        createCharts();
    }

    renderTable();

    renderTimelineChart();
    renderProportionAuthPrincipalsChart();
    renderProportionErrorsChart();
}

function render() {
    renderControls();
    renderCharts();
}

function rerender() {
    if (rerendering) {
        return;
    }

    rerendering = true;

    requestAnimationFrame(() => {
        rerendering = false;
        render();
    });
}



//
// UI event handlers
//

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

function parseDatetimeFilter(datetime) {
    return moment(datetime);
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

async function setAnalysis(logId) {
    currentLogId = logId;
    analysisLoading = true;

    rerender();

    const _analysis = await fetchAnalysis(logId);

    if (currentLogId !== logId) {
        return;
    }

    analysisLoading = false;

    const isEmpty = Object.values(_analysis.error_groups).filter(errors => errors.length > 0).length === 0 &&
                    Object.keys(_analysis.maybe_new_errors).length === 0;

    if (isEmpty) {
        analysis = null;
        errorGroups = null;
    } else {
        analysis = _analysis;
        errorGroups = analysis.error_groups;
        errorGroups = filterByChosenTimespan(errorGroups);
    }

    tableDetailsShown = false;

    rerender();
}

function onFileChange() {
    const logId = getRadioButtonValue('file');
    setAnalysis(logId);
}

function onTimespanChange() {
    rerender();
}


//
// main
//

function main() {
    // Did a log file start out selected?
    if (isRadioButtonSelected('file')) {
        onFileChange();
    }

    // Listen for future selection changes.
    for (const radioButton of document.getElementsByName('file')) {
        radioButton.addEventListener('change', onFileChange);
    }

    document.getElementById('from').addEventListener('change', onTimespanChange);
    document.getElementById('to').addEventListener('change', onTimespanChange);
}

document.addEventListener('DOMContentLoaded', main);
