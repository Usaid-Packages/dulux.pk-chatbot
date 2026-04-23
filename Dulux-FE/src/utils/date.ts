const DATE_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const PK_DATE_TIME_FORMATTER = new Intl.DateTimeFormat('en-PK', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

const PK_AUDIT_DATE_TIME_FORMATTER = new Intl.DateTimeFormat('en-PK', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

const parseTimestamp = (dateValue: string): number | null => {
  const timestamp = Date.parse(dateValue);
  return Number.isNaN(timestamp) ? null : timestamp;
};

export const formatDisplayDate = (dateValue: string): string => {
  const timestamp = parseTimestamp(dateValue);
  if (timestamp === null) {
    return 'Unknown';
  }

  return DATE_FORMATTER.format(timestamp);
};

export const formatDisplayDateTime = (dateValue: string): string => {
  const timestamp = parseTimestamp(dateValue);
  if (timestamp === null) {
    return 'Unknown';
  }

  return DATE_TIME_FORMATTER.format(timestamp);
};

export const formatPkDateTime = (dateValue: string, fallback = '--'): string => {
  const timestamp = parseTimestamp(dateValue);
  if (timestamp === null) {
    return fallback;
  }

  return PK_DATE_TIME_FORMATTER.format(timestamp);
};

export const formatPkDateTimeOptional = (dateValue?: string, fallback = '--'): string => {
  if (!dateValue) {
    return fallback;
  }

  return formatPkDateTime(dateValue, fallback);
};

export const formatPkAuditDateTime = (dateValue: string, fallback = 'Invalid timestamp'): string => {
  const timestamp = parseTimestamp(dateValue);
  if (timestamp === null) {
    return fallback;
  }

  return PK_AUDIT_DATE_TIME_FORMATTER.format(timestamp);
};
