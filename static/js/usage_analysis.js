document.addEventListener('DOMContentLoaded', () => {
    new CommonAnalysis({
        fetchPath: (logId) => `/usage_analysis/data/${logId}.json`
    });
});
