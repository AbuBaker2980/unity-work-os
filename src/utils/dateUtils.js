// src/utils/dateUtils.js

export const toDateObj = (val) => {
    if (!val) return null;
    if (typeof val.toDate === 'function') return val.toDate();
    return new Date(val);
};

export const formatDate = (dateInput) => {
    const date = toDateObj(dateInput);
    if (!date) return '';
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
};

export const formatTime = (timeInput) => {
    const date = toDateObj(timeInput);
    if (!date) return '...';
    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });
};

export const getDuration = (start, end) => {
    const s = toDateObj(start);
    const e = toDateObj(end);
    if (!s || !e) return '';

    const diffMs = e - s;
    const diffHrs = Math.floor(diffMs / 3600000);
    const diffMins = Math.floor((diffMs % 3600000) / 60000);

    return diffHrs > 0 ? `${diffHrs}h ${diffMins}m` : `${diffMins}m`;
};

export const getTodayString = () =>
    new Date().toISOString().split('T')[0];
