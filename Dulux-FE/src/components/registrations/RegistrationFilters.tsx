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
    <section className='wf-toolbar-panel border-primary/15 bg-white shadow-[0_10px_24px_rgba(19,87,167,0.08)]'>
      <div className='grid gap-3 md:grid-cols-1'>
        <Input
          type='search'
          value={searchValue}
          onChange={handleSearchInputChange}
          placeholder='Search by registration code, customer, or phone'
          className='h-11 rounded-xl border-primary/25 bg-white'
          aria-label='Search registrations'
        />
      </div>
    </section>
  );
};
