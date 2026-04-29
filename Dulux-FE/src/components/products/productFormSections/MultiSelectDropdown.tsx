import type { ChangeEvent, JSX } from 'react';

import { Check, ChevronDown } from 'lucide-react';

import { Input } from '#/components/ui';

export interface MultiSelectDropdownOption {
  id: number;
  label: string;
  meta?: string;
}

interface MultiSelectDropdownProps {
  label: string;
  dropdownId: string;
  isOpen: boolean;
  selectedCount: number;
  searchValue: string;
  searchPlaceholder: string;
  emptyMessage: string;
  options: MultiSelectDropdownOption[];
  selectedIds: number[];
  onToggle: () => void;
  onSearchChange: (value: string) => void;
  onToggleOption: (optionId: number, checked: boolean) => void;
}

/**
 * MultiSelectDropdown renders a searchable and toggleable selection list for numeric IDs.
 *
 * @param props - Dropdown label, options, selected IDs, and state handlers.
 * @returns Searchable multi-select dropdown block.
 */
export const MultiSelectDropdown = ({
  label,
  dropdownId,
  isOpen,
  selectedCount,
  searchValue,
  searchPlaceholder,
  emptyMessage,
  options,
  selectedIds,
  onToggle,
  onSearchChange,
  onToggleOption,
}: MultiSelectDropdownProps): JSX.Element => {
  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>): void => onSearchChange(event.target.value);

  const createCheckboxHandler = (optionId: number, isSelected: boolean) => (): void => {
    onToggleOption(optionId, !isSelected);
  };

  return (
    <div className='rounded-xl border border-primary/20 bg-white/85 p-3'>
      <button
        type='button'
        className='flex w-full items-center justify-between rounded-lg text-sm font-semibold text-text-primary'
        aria-expanded={isOpen}
        aria-controls={dropdownId}
        onClick={onToggle}
      >
        <span>
          {label} ({selectedCount})
        </span>
        <ChevronDown
          className={['h-4 w-4 text-text-muted transition-transform duration-200', isOpen ? 'rotate-180' : ''].join(
            ' '
          )}
        />
      </button>
      {isOpen ? (
        <div id={dropdownId} className='mt-3 space-y-3'>
          <Input
            type='search'
            value={searchValue}
            onChange={handleSearchChange}
            className='rounded-xl border-primary/20 bg-white'
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
          />
          <div className='max-h-34 space-y-2 overflow-y-auto pr-1'>
            {options.map(option => {
              const isSelected = selectedIds.includes(option.id);

              return (
                <button
                  key={option.id}
                  type='button'
                  className={[
                    'flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                    isSelected
                      ? 'border-primary/35 bg-primary/10 text-text-primary'
                      : 'border-primary/15 bg-white text-text-primary hover:border-primary/30 hover:bg-primary/5',
                  ].join(' ')}
                  onClick={createCheckboxHandler(option.id, isSelected)}
                  aria-pressed={isSelected}
                >
                  <span className='flex min-w-0 items-center gap-2'>
                    <span className='truncate font-medium'>{option.label}</span>
                    {option.meta ? <span className='shrink-0 text-xs text-text-muted'>{option.meta}</span> : null}
                  </span>
                  <span
                    className={[
                      'inline-flex h-5 w-5 items-center justify-center rounded-full border',
                      isSelected
                        ? 'border-primary bg-primary text-white'
                        : 'border-primary/20 bg-white text-transparent',
                    ].join(' ')}
                  >
                    <Check className='h-3 w-3' aria-hidden='true' />
                  </span>
                </button>
              );
            })}
            {options.length === 0 ? <p className='text-xs text-text-muted'>{emptyMessage}</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
};
