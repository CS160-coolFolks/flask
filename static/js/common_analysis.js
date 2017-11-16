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

function formatDatetimeFilter(datetime) {
    return datetime.format('YYYY-MM-DD HH:mm:ss');
}

function parseDatetimeFilter(datetime) {
    return moment(datetime);
}


class CommonAnalysis {
    //
    // Constructor
    //

    constructor() {
        this.currentLogId = null;
        this.analyses = {};
        this.analysesLoading = {};

        this.analysis = null;
        this.errorGroups = null;
        this.errorCategories = null;
        this.errorSeries = null;

        this.tableDetailsShown = false;
        this.chart = null;

        this.rerendering = false;

        // Listen for future selection changes.
        for (const listItem of document.getElementsByName('file')) {
            listItem.addEventListener('click', e => this.onListItemClicked(e));
        }

        document.getElementById('from').addEventListener('change', () => this.refreshAnalysis());
        document.getElementById('to').addEventListener('change', () => this.refreshAnalysis());

        document.getElementById('btn-details').addEventListener('click', () => this.onDetailsClick());
    }



    //
    // Render
    //

    renderThrobber() {
        for (const logId in this.analysesLoading) {
            const loading = this.analysesLoading[logId];
            const throbber = document.getElementById(`throbber-${logId}`);
            if (loading) {
                throbber.classList.remove('d-none');
            } else {
                throbber.classList.add('d-none');
            }
        }
    }

    renderListItems() {
        for (const listItem of document.getElementsByName('file')) {
            listItem.classList.remove('active');
        }
        if (this.currentLogId !== null) {
            document.getElementById(this.currentLogId).classList.add('active');
        }
    }

    renderTimes() {
        const fromEl = document.getElementById('from');
        const toEl = document.getElementById('to');
        const fromFeedback = document.getElementById('from-feedback');
        const toFeedback = document.getElementById('to-feedback');

        if (this.analysis === null) {
            fromEl.disabled = true;
            toEl.disabled = true;

            fromEl.placeholder = 'Start time';
            toEl.placeholder = 'End time';
        } else {
            fromEl.disabled = false;
            toEl.disabled = false;

            const errorGroups = this.analysis.error_groups;
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

    renderControls() {
        this.renderThrobber();
        this.renderListItems();
        this.renderTimes();
    }

    static clearTable() {
        const tbody = document.getElementById('tbody');
        while (tbody.firstChild) {
            tbody.removeChild(tbody.firstChild);
        }
    }

    static renderTableSmallRow(name, numOccurrences) {
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

    renderTableSmallBody() {
        document.getElementById('thead-details').classList.add('d-none');
        for (const name in this.errorGroups) {
            const numOccurrences = this.errorGroups[name].length;
            CommonAnalysis.renderTableSmallRow(name, numOccurrences);
        }
    }

    static renderTableLargeMainRow(name, numOccurrences, firstDetail) {
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

    static renderTableLargeSubRow(detail) {
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

    static removeTomcat(msg) {
        return msg.replace(/.*dchq_tomcat\[\d+\]: /, '');
    }

    renderTableLargeBody() {
        document.getElementById('thead-details').classList.remove('d-none');
        for (const name in this.errorGroups) {
            const errorGroup = this.errorGroups[name];
            const numOccurrences = errorGroup.length;
            CommonAnalysis.renderTableLargeMainRow(name, numOccurrences, CommonAnalysis.removeTomcat(errorGroup[0][2]));
            for (let i = 0; i < numOccurrences - 1; i++) {
                CommonAnalysis.renderTableLargeSubRow(CommonAnalysis.removeTomcat(errorGroup[i][2]));
            }
        }
    }

    renderTable() {
        const detailsBtn = document.getElementById('btn-details');

        CommonAnalysis.clearTable();
        if (this.tableDetailsShown) {
            detailsBtn.classList.add('active');
            this.renderTableLargeBody();
        } else {
            detailsBtn.classList.remove('active');
            this.renderTableSmallBody();
        }
    }

    renderTimelineChart() {
        if (this.errorCategories === null) {
            if (this.chart) {
                this.chart.destroy();
                this.chart = null;
            }
            return;
        }

        this.chart = Highcharts.chart('chart-timeline', {
            title: {
                text: undefined
            },

            tooltip: {
                shared: true
            },

            xAxis: {
                categories: this.errorCategories.map(formatDatetimeFilter)
            },

            series: this.errorSeries
        });
    }

    renderCharts() {
        const chartsContainer = document.getElementById('charts');

        if (this.analysis === null) {
            chartsContainer.classList.add('d-none');
            return;
        }

        chartsContainer.classList.remove('d-none');

        this.renderTable();

        this.renderTimelineChart();
    }

    render() {
        const scrollTop = document.documentElement.scrollTop;
        this.renderControls();
        this.renderCharts();
        requestAnimationFrame(() => {
            document.documentElement.scrollTop = scrollTop;
        });
    }

    rerender() {
        if (this.rerendering) {
            return;
        }

        this.rerendering = true;

        requestAnimationFrame(() => {
            this.rerendering = false;
            this.render();
        });
    }



    //
    // UI event handlers
    //

    fetchAnalysis(logId) {
        if (this.analyses[logId] === undefined) {
            this.analysesLoading[logId] = true;
            this.analyses[logId] = fetch(`/error_analysis/data/${logId}.json`, {credentials: 'include'})
                .then(response => {
                    this.analysesLoading[logId] = false;
                    return response.json()
                });
        }

        return this.analyses[logId];
    }

    static filterByTimespan(errorGroups, begin, end) {
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

    static filterByChosenTimespan(errorGroups) {
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

        return CommonAnalysis.filterByTimespan(errorGroups, begin, end);
    }

    calculateErrorCategories() {
        const errors = flatten(Object.values(this.errorGroups));

        if (errors.length === 0) {
            this.errorCategories = [];
            return;
        }

        const errorDates = errors.map(toMoment);

        const first = minOf(errorDates);
        const last = maxOf(errorDates);

        first.minute(0).second(0).millisecond(0);

        last.hour(last.hour() + 1);
        last.minute(0).second(0).millisecond(0);

        const categories = (last - first) / 3600000;

        this.errorCategories = [];
        for (let i = 0; i < categories; i++) {
            this.errorCategories.push(moment(first).hour(i));
        }
    }

    calculateErrorSeries() {
        this.errorSeries = [];

        for (const name in this.errorGroups) {
            const buckets = [];
            for (const _ of this.errorCategories) {
                buckets.push(0);
            }
            for (const error of this.errorGroups[name]) {
                const date = toMoment(error);

                let i;
                for (i = 0; i < this.errorCategories.length - 1; i++) {
                    if (date < this.errorCategories[i + 1]) {
                        buckets[i] += 1;
                        break;
                    }
                }
            }
            this.errorSeries.push({
                name,
                data: buckets
            });
        }
    }

    async refreshAnalysis() {
        const logId = this.currentLogId;

        if (logId === null) {
            return;
        }

        this.analysis = null;
        this.errorGroups = null;
        this.errorCategories = null;
        this.errorSeries = null;

        this.rerender();

        const _analysis = await this.fetchAnalysis(logId);

        if (logId !== this.currentLogId) {
            this.rerender();
            return;
        }

        const isEmpty = Object.values(_analysis.error_groups).filter(errors => errors.length > 0).length === 0 &&
                        Object.keys(_analysis.maybe_new_errors).length === 0;

        if (!isEmpty) {
            this.analysis = _analysis;
            this.errorGroups = this.analysis.error_groups;
            this.errorGroups = CommonAnalysis.filterByChosenTimespan(this.errorGroups);
            this.calculateErrorCategories();
            this.calculateErrorSeries();
        }

        this.tableDetailsShown = false;

        this.rerender();
    }

    onListItemClicked(e) {
        this.currentLogId = e.target.id;
        this.refreshAnalysis();
    }

    onDetailsClick() {
        this.tableDetailsShown = !this.tableDetailsShown;
        this.rerender();
    }
}
