import type { ChangeEvent, JSX } from 'react';

import { Button, Input } from '#/components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui/Select';
import { registrationStatuses, type RegistrationStatus } from '#/types/registrations';

interface RegistrationFiltersProps {
  searchValue: string;
  statusValue: RegistrationStatus | 'ALL';
  dateFrom: string;
  dateTo: string;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: RegistrationStatus | 'ALL') => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onAddManualRegistration: () => void;
}

/**
 * RegistrationFilters renders list filtering inputs and primary CTA.
 *
 * @param props - Filter state and handlers.
 * @returns Filter toolbar.
 */
export const RegistrationFilters = ({
  searchValue,
  statusValue,
  dateFrom,
  dateTo,
  onSearchChange,
  onStatusChange,
  onDateFromChange,
  onDateToChange,
  onAddManualRegistration,
}: RegistrationFiltersProps): JSX.Element => {
  const handleSearchInputChange = (event: ChangeEvent<HTMLInputElement>): void => {
    onSearchChange(event.target.value);
  };

  const handleStatusSelectionChange = (value: string): void => {
    if (value === 'ALL') {
      onStatusChange('ALL');
      return;
    }

    onStatusChange(value as RegistrationStatus);
  };

  const handleDateFromInputChange = (event: ChangeEvent<HTMLInputElement>): void => {
    onDateFromChange(event.target.value);
  };

  const handleDateToInputChange = (event: ChangeEvent<HTMLInputElement>): void => {
    onDateToChange(event.target.value);
  };

  return (
    <section className='rounded-lg border border-border bg-surface p-4'>
      <div className='grid gap-3 md:grid-cols-[2fr,1fr,1fr,1fr,auto]'>
        <Input
          type='search'
          value={searchValue}
          onChange={handleSearchInputChange}
          placeholder='Search by registration code, customer, or phone'
          aria-label='Search registrations'
        />
        <Select value={statusValue} onValueChange={handleStatusSelectionChange}>
          <SelectTrigger aria-label='Filter by status'>
            <SelectValue placeholder='Status' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='ALL'>All statuses</SelectItem>
            {registrationStatuses.map(status => (
              <SelectItem key={status} value={status}>
                {status.replace('_', ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input type='date' value={dateFrom} onChange={handleDateFromInputChange} aria-label='Date from' />
        <Input type='date' value={dateTo} onChange={handleDateToInputChange} aria-label='Date to' />
        <Button type='button' onClick={onAddManualRegistration}>
          Add Manual Registration
        </Button>
      </div>
    </section>
  );
};
