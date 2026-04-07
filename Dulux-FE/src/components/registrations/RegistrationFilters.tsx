import type { ChangeEvent, JSX } from 'react';

import { Button, Input } from '#/components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui/Select';
import { registrationStatuses, type RegistrationStatus } from '#/types/registrations';

const toStatusLabel = (status: string): string =>
  status
    .toLowerCase()
    .split('_')
    .map(token => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');

interface RegistrationFiltersProps {
  searchValue: string;
  statusValue: RegistrationStatus | 'ALL';
  onSearchChange: (value: string) => void;
  onStatusChange: (value: RegistrationStatus | 'ALL') => void;
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
  onSearchChange,
  onStatusChange,
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

  return (
    <section className='wf-toolbar-panel'>
      <div className='grid gap-3 md:grid-cols-[2fr,1fr,auto]'>
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
                {toStatusLabel(status)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type='button' onClick={onAddManualRegistration}>
          Add Manual Registration
        </Button>
      </div>
    </section>
  );
};
