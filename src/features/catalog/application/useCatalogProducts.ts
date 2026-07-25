'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Product, ParentProduct } from '@/shared/domain/types';
import {
  fetchProductsPage,
  type ProductsPageCursor,
} from '../infrastructure/firestoreProductsRepository';
import { fetchAllParentProducts } from '../infrastructure/firestoreParentProductsRepository';
import { fetchCategories, type CategoryDoc } from '../infrastructure/firestoreCategoriesRepository';
import { getProducts } from './getProducts';
import { filterProducts } from '../domain/filter';

const PAGE_SIZE = 16;

export function useCatalogProducts() {
  const [parentById, setParentById] = useState<Map<string, ParentProduct>>(new Map());
  const [categoryDocs, setCategoryDocs] = useState<CategoryDoc[]>([]);

  const [pagedProducts, setPagedProducts] = useState<Product[]>([]);
  const [cursor, setCursor] = useState<ProductsPageCursor>(null);
  const [hasMore, setHasMore] = useState(true);
  // initialLoading gates the very first paint only; pageLoading covers every
  // (re)fetch of page 1 (including category switches) and is shown inline by
  // CatalogGrid so the search box / category buttons never unmount.
  const [initialLoading, setInitialLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [selectedCategory, setSelectedCategoryState] = useState('All');
  const [selectedSubcategory, setSelectedSubcategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const [searchCache, setSearchCache] = useState<Product[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    fetchAllParentProducts().then((parents) => {
      setParentById(new Map(parents.map((p) => [p.id, p])));
    });
    fetchCategories().then(setCategoryDocs);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setPageLoading(true);
    setPagedProducts([]);
    setCursor(null);
    setHasMore(true);
    fetchProductsPage(PAGE_SIZE, selectedCategory, null).then((page) => {
      if (cancelled) return;
      setPagedProducts(page.products);
      setCursor(page.cursor);
      setHasMore(page.hasMore);
      setPageLoading(false);
      setInitialLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedCategory]);

  const loadMore = useCallback(() => {
    if (loadingMore || pageLoading || !hasMore) return;
    setLoadingMore(true);
    fetchProductsPage(PAGE_SIZE, selectedCategory, cursor).then((page) => {
      setPagedProducts((prev) => [...prev, ...page.products]);
      setCursor(page.cursor);
      setHasMore(page.hasMore);
      setLoadingMore(false);
    });
  }, [selectedCategory, cursor, loadingMore, pageLoading, hasMore]);

  const isSearching = searchQuery.trim().length > 0;

  useEffect(() => {
    if (!isSearching || searchCache || searchLoading) return;
    setSearchLoading(true);
    getProducts().then((all) => {
      setSearchCache(all);
      setSearchLoading(false);
    });
  }, [isSearching, searchCache, searchLoading]);

  const setSelectedCategory = useCallback((category: string) => {
    setSelectedCategoryState(category);
    setSelectedSubcategory('All');
  }, []);

  const withParent = (product: Product): Product =>
    product.parentProductId ? { ...product, parentProduct: parentById.get(product.parentProductId) } : product;

  const baseList = isSearching ? searchCache ?? [] : pagedProducts;
  const visibleProducts = filterProducts(baseList, {
    search: isSearching ? searchQuery : undefined,
    category: selectedCategory,
    subcategory: selectedSubcategory,
  }).map(withParent);

  const categories = ['All', ...categoryDocs.map((c) => c.name)];
  const subcategories =
    selectedCategory === 'All'
      ? []
      : ['All', ...(categoryDocs.find((c) => c.name === selectedCategory)?.subcategories ?? [])];

  return {
    visibleProducts,
    categories,
    subcategories,
    selectedCategory,
    setSelectedCategory,
    selectedSubcategory,
    setSelectedSubcategory,
    searchQuery,
    setSearchQuery,
    // Gates the very first paint (page.tsx swaps its whole-page spinner in/out).
    loading: initialLoading,
    // Gates just the results area inside CatalogGrid — category switches and the
    // one-time search-cache fetch show this without unmounting the search box /
    // category buttons.
    resultsLoading: isSearching ? searchLoading && !searchCache : pageLoading,
    loadingMore,
    hasMore: isSearching ? false : hasMore,
    loadMore,
  };
}
