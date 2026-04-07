import type { JSX } from 'react';

import { Link } from 'react-router-dom';

import { Badge, Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '#/components/ui';
import { ROUTES } from '#/constants';
import type { Product } from '#/types/products';

interface ProductTableProps {
  products: Product[];
  onDelete: (product: Product) => void;
}

const getTypeBadgeClassName = (type: Product['productType']): string => {
  return type === 'TOPCOAT'
    ? 'bg-productType-topcoat-bg text-productType-topcoat-text'
    : 'bg-productType-basecoat-bg text-productType-basecoat-text';
};

export const ProductTable = ({ products, onDelete }: ProductTableProps): JSX.Element => {
  return (
    <div className='wf-card'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className='w-16'>Image</TableHead>
            <TableHead>Product Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Surface Types</TableHead>
            <TableHead>Linked Basecoats</TableHead>
            <TableHead>Coverage</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map(product => {
            const imageUrl = product.images[0]?.image.url ?? product.images[0]?.image.image ?? '';
            const handleDeleteClick = (): void => onDelete(product);

            return (
              <TableRow key={product.id}>
                <TableCell>
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={`${product.name} preview`}
                      className='h-10 w-10 rounded-md border border-border object-cover'
                    />
                  ) : (
                    <span className='inline-flex h-10 w-10 items-center justify-center rounded-md border border-dashed border-border text-xs text-text-muted'>
                      N/A
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <p className='font-medium text-text-primary'>{product.name}</p>
                  <p className='text-xs text-text-muted'>{product.warrantyYears} years warranty</p>
                </TableCell>
                <TableCell>
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getTypeBadgeClassName(product.productType)}`}
                  >
                    {product.productType === 'TOPCOAT' ? 'Topcoat' : 'Basecoat'}
                  </span>
                </TableCell>
                <TableCell>
                  <div className='flex flex-wrap gap-1'>
                    {product.surfaceTypes.length === 0 ? (
                      <span className='text-xs text-text-muted'>No surfaces</span>
                    ) : (
                      product.surfaceTypes.map(surfaceType => (
                        <span key={surfaceType.id} className='wf-chip-surface'>
                          {surfaceType.name}
                        </span>
                      ))
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {product.productType !== 'TOPCOAT' ? (
                    <span className='text-xs text-text-muted'>N/A</span>
                  ) : product.basecoats.length === 0 ? (
                    <span className='text-xs text-text-muted'>No linked basecoats</span>
                  ) : (
                    <div className='flex flex-wrap gap-1'>
                      {product.basecoats.map(basecoat => (
                        <span key={basecoat.id} className='wf-chip-surface'>
                          {basecoat.name}
                        </span>
                      ))}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <p className='text-sm text-text-primary'>{product.coverageDetails}</p>
                </TableCell>
                <TableCell>
                  <Badge variant={product.isActive ? 'success' : 'destructive'}>
                    {product.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className='flex items-center gap-2'>
                    <Link className='wf-table-link' to={ROUTES.PRODUCT_EDIT(String(product.id))}>
                      Edit
                    </Link>
                    <Button
                      type='button'
                      variant='link'
                      className='h-auto p-0 text-destructive'
                      onClick={handleDeleteClick}
                    >
                      Delete
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
