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

export const formatDisplayDate = (dateValue: string): string => {
  const timestamp = Date.parse(dateValue);
  if (Number.isNaN(timestamp)) {
    return 'Unknown';
  }

  return DATE_FORMATTER.format(timestamp);
};

export const formatDisplayDateTime = (dateValue: string): string => {
  const timestamp = Date.parse(dateValue);
  if (Number.isNaN(timestamp)) {
    return 'Unknown';
  }

  return DATE_TIME_FORMATTER.format(timestamp);
};
