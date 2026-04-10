import type { JSX } from 'react';

import { Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '#/components/ui';
import type { SurfaceType } from '#/types/products';

interface SurfaceTypeTableProps {
  surfaceTypes: SurfaceType[];
  linkedProductCountMap: Record<number, number>;
  onEdit: (surfaceType: SurfaceType) => void;
}

export const SurfaceTypeTable = ({
  surfaceTypes,
  linkedProductCountMap,
  onEdit,
}: SurfaceTypeTableProps): JSX.Element => {
  return (
    <div className='wf-card wf-card-p4 border-primary/15 bg-white/90 shadow-[0_14px_28px_rgba(19,87,167,0.09)]'>
      <Table containerClassName='max-h-[62vh] overflow-y-auto overflow-x-auto border-primary/10'>
        <TableHeader>
          <TableRow>
            <TableHead>Surface Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Linked Products</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {surfaceTypes.map(surfaceType => {
            const linkedCount = linkedProductCountMap[surfaceType.id] ?? 0;
            const handleEditClick = (): void => onEdit(surfaceType);

            return (
              <TableRow key={surfaceType.id}>
                <TableCell className='font-medium text-text-primary'>{surfaceType.name}</TableCell>
                <TableCell>{surfaceType.environment === 'INTERIOR' ? 'Interior' : 'Exterior'}</TableCell>
                <TableCell>{linkedCount}</TableCell>
                <TableCell>{linkedCount > 0 ? 'In Use' : 'Available'}</TableCell>
                <TableCell className='align-middle'>
                  <div className='flex items-center gap-2'>
                    <Button type='button' variant='link' className='h-auto p-0' onClick={handleEditClick}>
                      Edit
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
