import type { JSX } from 'react';
import { useEffect, useMemo } from 'react';

import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';

import { ImagePreviewGallery } from '#/components/ui';
import { useGetManualRegistrationProductsQuery } from '#/data-layer/registrations';
import type { ManualRegistrationFormValues } from '#/types/manualRegistration';

const renderReviewRow = (label: string, value?: string): JSX.Element => {
  return (
    <div key={label} className='rounded-md border border-border bg-surface-subtle p-3'>
      <p className='text-xs uppercase tracking-wide text-text-muted'>{label}</p>
      <p className='mt-1 text-sm font-medium text-text-primary'>{value ?? '—'}</p>
    </div>
  );
};

/**
 * ReviewStep renders a final summary before manual-registration submission.
 *
 * @returns Review step section.
 */
export const ReviewStep = (): JSX.Element => {
  const { control } = useFormContext<ManualRegistrationFormValues>();
  const { fields } = useFieldArray({
    control,
    name: 'additionalPaintPairs',
  });
  const manualProductsQuery = useGetManualRegistrationProductsQuery();

  const values = useWatch({ control });
  const allProducts = [
    ...(manualProductsQuery.data?.topcoatProducts ?? []),
    ...(manualProductsQuery.data?.basecoatProducts ?? []),
  ];
  const topcoatProductLabel = allProducts.find(product => product.id === values.topcoatProductId)?.label ?? '—';
  const basecoatProductLabel = values.basecoatProductId
    ? (allProducts.find(product => product.id === values.basecoatProductId)?.label ?? values.basecoatProductId)
    : '';

  const allPaintPairs = [
    {
      topcoatProductId: values.topcoatProductId,
      topcoatQuantity: values.topcoatQuantity,
      basecoatProductId: values.basecoatProductId,
      basecoatQuantity: values.basecoatQuantity,
      topcoatInvoice: values.topcoatInvoice,
      basecoatInvoice: values.basecoatInvoice,
    },
    ...(values.additionalPaintPairs ?? []),
  ];

  const invoicePreviewItems = useMemo(() => {
    const items: Array<{ id: string; label: string; url: string }> = [];

    allPaintPairs.forEach((pair, index) => {
      if (pair.topcoatInvoice && pair.topcoatInvoice.type.startsWith('image/')) {
        items.push({
          id: `pair-${index + 1}-topcoat`,
          label: `Pair ${index + 1} Topcoat Invoice`,
          url: URL.createObjectURL(pair.topcoatInvoice),
        });
      }

      if (pair.basecoatInvoice && pair.basecoatInvoice.type.startsWith('image/')) {
        items.push({
          id: `pair-${index + 1}-basecoat`,
          label: `Pair ${index + 1} Basecoat Invoice`,
          url: URL.createObjectURL(pair.basecoatInvoice),
        });
      }
    });

    return items;
  }, [allPaintPairs]);

  useEffect(() => {
    return () => {
      invoicePreviewItems.forEach(item => {
        URL.revokeObjectURL(item.url);
      });
    };
  }, [invoicePreviewItems]);

  return (
    <section className='space-y-4 wf-card wf-card-p5'>
      <header>
        <h3 className='text-lg font-semibold text-text-primary'>Review</h3>
        <p className='text-sm text-text-muted'>Confirm all details before submitting this manual registration.</p>
      </header>

      <div className='space-y-3'>
        <h4 className='text-sm font-semibold text-text-primary'>Personal Information</h4>
        <div className='grid gap-3 md:grid-cols-2'>
          {renderReviewRow('Customer Name', values.customerName)}
          {renderReviewRow('Phone Number', values.phoneNumber)}
          {renderReviewRow('Email', values.email)}
          {renderReviewRow('City', values.city)}
          {renderReviewRow('Province', values.province)}
          {renderReviewRow('Postal Code', values.postalCode || '--')}
          {renderReviewRow('Site Address', values.siteAddress)}
        </div>
      </div>

      <div className='space-y-3'>
        <h4 className='text-sm font-semibold text-text-primary'>Purchase & Dealer</h4>
        <div className='grid gap-3 md:grid-cols-2'>
          {renderReviewRow('Purchase Date', values.purchaseDate)}
          {renderReviewRow('Dealer Name', values.purchaseDealer)}
          {renderReviewRow('Dealer City', values.purchaseDealerCity)}
          {renderReviewRow('Dealer Address', values.purchaseDealerAddress)}
          {renderReviewRow('Notes', values.notes)}
        </div>
      </div>

      <div className='space-y-3'>
        <h4 className='text-sm font-semibold text-text-primary'>Products & Invoices</h4>
        <div className='space-y-3'>
          <div className='grid gap-3 md:grid-cols-2'>
            {renderReviewRow('Topcoat Product', topcoatProductLabel)}
            {renderReviewRow('Topcoat Quantity', values.topcoatQuantity)}
            {renderReviewRow('Basecoat Product', basecoatProductLabel || '--')}
            {renderReviewRow('Basecoat Quantity', values.basecoatQuantity || '--')}
            {renderReviewRow('Topcoat Invoice', values.topcoatInvoice?.name)}
            {renderReviewRow('Basecoat Invoice', values.basecoatInvoice?.name)}
          </div>

          {(values.additionalPaintPairs ?? []).map((pair, index) => {
            const pairTopcoatLabel = allProducts.find(product => product.id === pair.topcoatProductId)?.label ?? '—';
            const pairBasecoatLabel = pair.basecoatProductId
              ? (allProducts.find(product => product.id === pair.basecoatProductId)?.label ?? pair.basecoatProductId)
              : '--';

            return (
              <div
                key={fields[index]?.id ?? pair.topcoatProductId}
                className='space-y-2 rounded-md border border-border p-3'
              >
                <p className='text-sm font-semibold text-text-primary'>Paint Pair {index + 2}</p>
                <div className='grid gap-3 md:grid-cols-2'>
                  {renderReviewRow('Topcoat Product', pairTopcoatLabel)}
                  {renderReviewRow('Topcoat Quantity', pair.topcoatQuantity)}
                  {renderReviewRow('Basecoat Product', pairBasecoatLabel)}
                  {renderReviewRow('Basecoat Quantity', pair.basecoatQuantity || '--')}
                  {renderReviewRow('Topcoat Invoice', pair.topcoatInvoice?.name)}
                  {renderReviewRow('Basecoat Invoice', pair.basecoatInvoice?.name)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <ImagePreviewGallery
        title='Invoice Image Preview'
        description='Click any invoice image to review it in full size before submission.'
        items={invoicePreviewItems}
        emptyMessage='No image invoices selected yet.'
        fallbackModalTitle='Invoice Preview'
      />
    </section>
  );
};
