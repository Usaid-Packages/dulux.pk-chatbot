import type { JSX } from 'react';

import { Link, useLocation } from 'react-router-dom';

import { Badge, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '#/components/ui';
import { ROUTES } from '#/constants';
import { PRODUCT_TYPES } from '#/types/products';
import type { Product } from '#/types/products';

interface ProductTableProps {
  canEdit: boolean;
  products: Product[];
}

const getTypeBadgeClassName = (type: Product['productType']): string => {
  return type === PRODUCT_TYPES.TOPCOAT
    ? 'bg-productType-topcoat-bg text-productType-topcoat-text'
    : 'bg-productType-basecoat-bg text-productType-basecoat-text';
};

const getSurfaceEnvironmentBadgeClassName = (environment: Product['surfaceTypes'][number]['environment']): string => {
  return environment === 'INTERIOR'
    ? 'border border-primary/20 bg-primary/10 text-primary'
    : 'border border-productType-basecoat-text/25 bg-productType-basecoat-bg text-productType-basecoat-text';
};

const getSurfaceEnvironmentShortLabel = (
  environment: Product['surfaceTypes'][number]['environment']
): 'INT' | 'EXT' => {
  return environment === 'INTERIOR' ? 'INT' : 'EXT';
};

const renderSurfaceTypes = (product: Product): JSX.Element => {
  if (product.surfaceTypes.length === 0) {
    return <span className='text-xs text-text-muted'>N/A</span>;
  }

  return (
    <div className='flex flex-wrap gap-1.5'>
      {product.surfaceTypes.map(surfaceType => (
        <span
          key={surfaceType.id}
          className='inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1'
        >
          <span className='text-xs font-medium text-text-primary'>{surfaceType.name}</span>
          <span
            className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.4px] ${getSurfaceEnvironmentBadgeClassName(
              surfaceType.environment
            )}`}
          >
            {getSurfaceEnvironmentShortLabel(surfaceType.environment)}
          </span>
        </span>
      ))}
    </div>
  );
};

const renderLinkedBasecoats = (product: Product): JSX.Element => {
  if (product.productType !== PRODUCT_TYPES.TOPCOAT) {
    return <span className='text-xs text-text-muted'>N/A</span>;
  }

  if (product.basecoats.length === 0) {
    return <span className='text-xs text-text-muted'>N/A</span>;
  }

  return (
    <div className='flex flex-wrap gap-1'>
      {product.basecoats.map(basecoat => (
        <span key={basecoat.id} className='wf-chip-surface'>
          {basecoat.name}
        </span>
      ))}
    </div>
  );
};

export const ProductTable = ({ canEdit, products }: ProductTableProps): JSX.Element => {
  const location = useLocation();

  return (
    <div className='wf-card wf-card-p4 border-primary/15 bg-white/90 shadow-[0_14px_28px_rgba(19,87,167,0.09)]'>
      <Table containerClassName='max-h-[62vh] overflow-y-auto overflow-x-auto border-primary/10'>
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

            return (
              <TableRow key={product.id}>
                <TableCell>
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={`${product.name} preview`}
                      className='h-10 w-10 rounded-lg border border-primary/15 object-cover'
                    />
                  ) : (
                    <span className='inline-flex h-10 w-10 items-center justify-center rounded-lg border border-dashed border-primary/20 text-xs text-text-muted'>
                      N/A
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <p className='line-clamp-3 max-w-[16rem] whitespace-normal font-medium text-text-primary'>
                    {product.name}
                  </p>
                  <p className='text-xs text-text-muted'>{product.warrantyYears} years warranty</p>
                </TableCell>
                <TableCell>
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getTypeBadgeClassName(product.productType)}`}
                  >
                    {product.productType === PRODUCT_TYPES.TOPCOAT ? 'Topcoat' : 'Basecoat'}
                  </span>
                </TableCell>
                <TableCell>{renderSurfaceTypes(product)}</TableCell>
                <TableCell>{renderLinkedBasecoats(product)}</TableCell>
                <TableCell>
                  <p className='text-sm text-text-primary'>{product.coverageDetails}</p>
                </TableCell>
                <TableCell>
                  <Badge variant={product.isActive ? 'success' : 'destructive'}>
                    {product.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell className='align-middle'>
                  {canEdit ? (
                    <Link className='wf-table-link' to={`${ROUTES.PRODUCT_EDIT(String(product.id))}${location.search}`}>
                      Edit
                    </Link>
                  ) : (
                    <span className='text-xs font-medium text-text-muted'>View only</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
