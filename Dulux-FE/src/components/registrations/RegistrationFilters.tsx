import type { ChangeEvent, JSX } from 'react';

import { Input } from '#/components/ui';

interface RegistrationFiltersProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
}

/**
 * RegistrationFilters renders list filtering inputs and primary CTA.
 *
 * @param props - Filter state and handlers.
 * @returns Filter toolbar.
 */
export const RegistrationFilters = ({ searchValue, onSearchChange }: RegistrationFiltersProps): JSX.Element => {
  const handleSearchInputChange = (event: ChangeEvent<HTMLInputElement>): void => {
    onSearchChange(event.target.value);
  };

  return (
    <section className='wf-toolbar-panel wf-toolbar-panel-contrast'>
      <div className='grid gap-3 md:grid-cols-1'>
        <Input
          type='search'
          value={searchValue}
          onChange={handleSearchInputChange}
          placeholder='Search by registration code, customer, or phone'
          aria-label='Search registrations'
        />
      </div>
    </section>
  );
};
