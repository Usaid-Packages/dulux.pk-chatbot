import type { ChangeEvent, JSX } from 'react';

import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui';
import {
  AUDIT_LOG_ACTIONS,
  AUDIT_LOG_ORDERING_OPTIONS,
  type AuditLogActionFilter,
  type AuditLogListFilters,
  type AuditLogOrdering,
} from '#/types/auditLogs';
import { getAuditActionLabel } from './helpers';

interface AuditLogsFiltersProps {
  filters: AuditLogListFilters;
  onSetAction: (action: AuditLogActionFilter) => void;
  onSetOrdering: (ordering: AuditLogOrdering) => void;
  onSetActor: (actor: string) => void;
  onSetModelLabel: (modelLabel: string) => void;
  onSetObjectId: (objectId: string) => void;
  onSetDateFrom: (dateFrom: string) => void;
  onSetDateTo: (dateTo: string) => void;
  onSetSearch: (search: string) => void;
}

/**
 * AuditLogsFilters renders list filter controls backed by query param state.
 *
 * @param props - Filter values and setter callbacks.
 * @returns Audit log filter controls.
 */
export const AuditLogsFilters = ({
  filters,
  onSetAction,
  onSetOrdering,
  onSetActor,
  onSetModelLabel,
  onSetObjectId,
  onSetDateFrom,
  onSetDateTo,
  onSetSearch,
}: AuditLogsFiltersProps): JSX.Element => {
  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>): void => {
    onSetSearch(event.target.value);
  };

  const handleActorChange = (event: ChangeEvent<HTMLInputElement>): void => {
    onSetActor(event.target.value);
  };

  const handleModelLabelChange = (event: ChangeEvent<HTMLInputElement>): void => {
    onSetModelLabel(event.target.value);
  };

  const handleObjectIdChange = (event: ChangeEvent<HTMLInputElement>): void => {
    onSetObjectId(event.target.value);
  };

  const handleDateFromChange = (event: ChangeEvent<HTMLInputElement>): void => {
    onSetDateFrom(event.target.value);
  };

  const handleDateToChange = (event: ChangeEvent<HTMLInputElement>): void => {
    onSetDateTo(event.target.value);
  };

  const handleActionValueChange = (value: string): void => {
    onSetAction(value as AuditLogActionFilter);
  };

  const handleOrderingValueChange = (value: string): void => {
    onSetOrdering(value as AuditLogOrdering);
  };

  return (
    <section className='wf-toolbar-panel border-primary/15 bg-white shadow-[0_10px_24px_rgba(19,87,167,0.08)]'>
      <div className='grid gap-3 lg:grid-cols-2'>
        <Input
          id='audit-search'
          type='search'
          placeholder='Search actor email, object, model, or object id'
          value={filters.search}
          className='h-11 rounded-xl border-primary/25 bg-white'
          onChange={handleSearchChange}
        />

        <Select value={filters.ordering} onValueChange={handleOrderingValueChange}>
          <SelectTrigger id='audit-ordering' className='h-11 rounded-xl border-primary/25 bg-white'>
            <SelectValue placeholder='Order by' />
          </SelectTrigger>
          <SelectContent>
            {AUDIT_LOG_ORDERING_OPTIONS.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className='mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4'>
        <Select value={filters.action} onValueChange={handleActionValueChange}>
          <SelectTrigger id='audit-action' className='h-10 rounded-xl border-primary/25 bg-white'>
            <SelectValue placeholder='Action' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All actions</SelectItem>
            {AUDIT_LOG_ACTIONS.map(action => (
              <SelectItem key={action} value={action}>
                {getAuditActionLabel(action)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          id='audit-actor'
          type='text'
          inputMode='numeric'
          placeholder='Actor ID'
          value={filters.actor}
          className='h-10 rounded-xl border-primary/25 bg-white'
          onChange={handleActorChange}
        />

        <Input
          id='audit-model-label'
          type='text'
          placeholder='Model label (e.g. products.Product)'
          value={filters.modelLabel}
          className='h-10 rounded-xl border-primary/25 bg-white'
          onChange={handleModelLabelChange}
        />

        <Input
          id='audit-object-id'
          type='text'
          placeholder='Object ID'
          value={filters.objectId}
          className='h-10 rounded-xl border-primary/25 bg-white'
          onChange={handleObjectIdChange}
        />
      </div>

      <div className='mt-3 grid gap-3 md:grid-cols-2'>
        <Input
          id='audit-date-from'
          type='date'
          value={filters.dateFrom}
          className='h-10 rounded-xl border-primary/25 bg-white'
          onChange={handleDateFromChange}
        />

        <Input
          id='audit-date-to'
          type='date'
          value={filters.dateTo}
          className='h-10 rounded-xl border-primary/25 bg-white'
          onChange={handleDateToChange}
        />
      </div>
    </section>
  );
};
