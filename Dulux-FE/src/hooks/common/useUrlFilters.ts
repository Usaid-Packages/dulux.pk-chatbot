import { useSearchParams } from 'react-router-dom';

interface UseUrlFiltersOptions {
  defaultPage?: number;
  pageParamKey?: string;
}

interface SetUrlFilterParamOptions {
  resetPage?: boolean;
  trimValue?: boolean;
  removeWhenEmpty?: boolean;
}

interface UseUrlFiltersResult {
  searchParams: URLSearchParams;
  setPage: (page: number) => void;
  setParams: (
    updater: (nextParams: URLSearchParams) => void,
    options?: { resetPage?: boolean; replace?: boolean }
  ) => void;
  setParam: (key: string, value: string | undefined, options?: SetUrlFilterParamOptions) => void;
  replaceAllParams: (nextParams: URLSearchParams) => void;
}

const DEFAULT_PAGE_PARAM_KEY = 'page';
const DEFAULT_PAGE = 1;

/**
 * useUrlFilters centralizes URL query-param mutations with optional page reset behavior.
 *
 * @param options - Page param key and default page configuration.
 * @returns Current search params and typed mutation helpers.
 */
export const useUrlFilters = ({
  defaultPage = DEFAULT_PAGE,
  pageParamKey = DEFAULT_PAGE_PARAM_KEY,
}: UseUrlFiltersOptions = {}): UseUrlFiltersResult => {
  const [searchParams, setSearchParams] = useSearchParams();

  const setParams = (
    updater: (nextParams: URLSearchParams) => void,
    options?: { resetPage?: boolean; replace?: boolean }
  ): void => {
    const shouldResetPage = options?.resetPage ?? false;
    const shouldReplace = options?.replace ?? false;

    setSearchParams(
      previous => {
        const nextParams = new URLSearchParams(previous);
        updater(nextParams);
        if (shouldResetPage) {
          nextParams.set(pageParamKey, String(defaultPage));
        }
        return nextParams;
      },
      { replace: shouldReplace }
    );
  };

  const setParam = (key: string, value: string | undefined, options?: SetUrlFilterParamOptions): void => {
    const shouldTrim = options?.trimValue ?? false;
    const shouldRemoveWhenEmpty = options?.removeWhenEmpty ?? true;
    const shouldResetPage = options?.resetPage ?? false;
    const normalizedValue = shouldTrim ? (value?.trim() ?? '') : (value ?? '');
    const hasValue = normalizedValue.length > 0;

    setParams(
      nextParams => {
        if (!hasValue && shouldRemoveWhenEmpty) {
          nextParams.delete(key);
          return;
        }

        nextParams.set(key, normalizedValue);
      },
      { resetPage: shouldResetPage }
    );
  };

  const setPage = (page: number): void => {
    if (!Number.isFinite(page) || page < 1) {
      return;
    }

    setParams(nextParams => {
      nextParams.set(pageParamKey, String(page));
    });
  };

  const replaceAllParams = (nextParams: URLSearchParams): void => {
    setSearchParams(nextParams, { replace: true });
  };

  return {
    searchParams,
    setPage,
    setParams,
    setParam,
    replaceAllParams,
  };
};
