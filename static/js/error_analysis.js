document.addEventListener('DOMContentLoaded', () => {
    new CommonAnalysis({
        fetchPath: (logId) => `/error_analysis/data/${logId}.json`
    });
});
