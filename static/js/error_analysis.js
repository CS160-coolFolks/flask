let currentLogId = null;
const analyses = {};
let analysisLoading = true;
let analysis = null;
let errorGroups = null;
let errorCategories = null;
let errorSeries = null;

let tableDetailsShown = false;

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

function renderListItems() {
    for (const listItem of document.getElementsByName('file')) {
        listItem.classList.remove('active');
    }
    if (currentLogId !== null) {
        document.getElementById(currentLogId).classList.add('active');
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
        fromEl.disabled = true;
        toEl.disabled = true;

        fromEl.placeholder = 'Start time';
        toEl.placeholder = 'End time';
    } else {
        fromEl.disabled = false;
        toEl.disabled = false;

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
    renderListItems();
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
    document.getElementById('thead-details').classList.add('d-none');
    for (const name in errorGroups) {
        const numOccurrences = errorGroups[name].length;
        renderTableSmallRow(name, numOccurrences);
    }
}

function renderTableLargeMainRow(name, numOccurrences, firstDetail) {
    const nameEl = document.createElement('td');
    nameEl.appendChild(document.createTextNode(name));

    const numEl = document.createElement('td');
    numEl.appendChild(document.createTextNode(numOccurrences));

    const detailEl = document.createElement('td');
    detailEl.appendChild(document.createTextNode(firstDetail));

    const tr = document.createElement('tr');
    tr.appendChild(nameEl);
    tr.appendChild(numEl);
    tr.appendChild(detailEl);

    const tbody = document.getElementById('tbody');
    tbody.appendChild(tr);
}

function renderTableLargeSubRow(detail) {
    const nameEl = document.createElement('td');

    const numEl = document.createElement('td');

    const detailEl = document.createElement('td');
    detailEl.classList.add('detail');
    detailEl.appendChild(document.createTextNode(detail));

    const tr = document.createElement('tr');
    tr.classList.add('minor');
    tr.appendChild(nameEl);
    tr.appendChild(numEl);
    tr.appendChild(detailEl);

    const tbody = document.getElementById('tbody');
    tbody.appendChild(tr);
}

function renderTableLargeBody() {
    document.getElementById('thead-details').classList.remove('d-none');
    for (const name in errorGroups) {
        const errorGroup = errorGroups[name];
        const numOccurrences = errorGroup.length;
        renderTableLargeMainRow(name, numOccurrences, errorGroup[0][2]);
        for (let i = 0; i < numOccurrences - 1; i++) {
            renderTableLargeSubRow(errorGroup[i][2]);
        }
    }
}

function renderTable() {
    const detailsBtn = document.getElementById('btn-details');

    clearTable();
    if (tableDetailsShown) {
        detailsBtn.classList.add('active');
        renderTableLargeBody();
    } else {
        detailsBtn.classList.remove('active');
        renderTableSmallBody();
    }
}

function renderTimelineChart() {
    const labels = Object.keys(errorGroups);
    const series = Object.values(errorGroups).map(errorList => errorList.length);

    Highcharts.chart('chart-timeline', {
        title: {
            text: undefined
        },

        tooltip: {
            shared: true
        },

        xAxis: {
            categories: errorCategories.map(formatDatetimeFilter)
        },

        series: errorSeries
    });
}

function renderCharts() {
    const chartsContainer = document.getElementById('charts');

    if (analysis === null) {
        chartsContainer.classList.add('d-none');
        return;
    }

    chartsContainer.classList.remove('d-none');

    renderTable();

    renderTimelineChart();
}

function render() {
    const scrollTop = document.documentElement.scrollTop;
    renderControls();
    renderCharts();
    requestAnimationFrame(() => {
        document.documentElement.scrollTop = scrollTop;
    });
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

function calculateErrorCategories() {
    const errors = flatten(Object.values(errorGroups));
    const errorDates = errors.map(toMoment);

    const first = minOf(errorDates);
    const last = maxOf(errorDates);

    first.minute(0).second(0).millisecond(0);

    last.hour(last.hour() + 1);
    last.minute(0).second(0).millisecond(0);

    const categories = (last - first) / 3600000;

    errorCategories = [];
    for (let i = 0; i < categories; i++) {
        errorCategories.push(moment(first).hour(i));
    }
}

function calculateErrorSeries() {
    errorSeries = [];

    for (const name in errorGroups) {
        const buckets = [];
        for (const _ of errorCategories) {
            buckets.push(0);
        }
        for (const error of errorGroups[name]) {
            const date = toMoment(error);

            let i;
            for (i = 0; i < errorCategories.length - 1; i++) {
                if (date < errorCategories[i + 1]) {
                    buckets[i] += 1;
                    break;
                }
            }
        }
        errorSeries.push({
            name,
            data: buckets
        });
    }
}

async function refreshAnalysis() {
    const logId = currentLogId;

    if (logId === null) {
        return;
    }

    analysisLoading = true;

    analysis = null;
    errorGroups = null;
    errorCategories = null;
    errorSeries = null;

    rerender();

    const _analysis = await fetchAnalysis(logId);

    if (logId !== currentLogId) {
        return;
    }

    const isEmpty = Object.values(_analysis.error_groups).filter(errors => errors.length > 0).length === 0 &&
                    Object.keys(_analysis.maybe_new_errors).length === 0;

    analysisLoading = false;

    if (!isEmpty) {
        analysis = _analysis;
        errorGroups = analysis.error_groups;
        errorGroups = filterByChosenTimespan(errorGroups);
        calculateErrorCategories();
        calculateErrorSeries();
    }

    tableDetailsShown = false;

    rerender();
}

function onListItemClicked(e) {
    currentLogId = e.target.id;
    refreshAnalysis();
}

function onDetailsClick() {
    tableDetailsShown = !tableDetailsShown;
    rerender();
}


//
// main
//

function main() {
    // Listen for future selection changes.
    for (const listItem of document.getElementsByName('file')) {
        listItem.addEventListener('click', onListItemClicked);
    }

    document.getElementById('from').addEventListener('change', refreshAnalysis);
    document.getElementById('to').addEventListener('change', refreshAnalysis);

    document.getElementById('btn-details').addEventListener('click', onDetailsClick);
}

document.addEventListener('DOMContentLoaded', main);

document.body.style['overflow-y'] = 'scroll';
