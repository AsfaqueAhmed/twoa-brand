import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getProductById } from '@/features/product/application/getProductById';
import ProductDetailView from '@/features/product/presentation/ProductDetailView';
import Navbar from '@/features/catalog/presentation/Navbar';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const product = await getProductById(id);
  if (!product) return { title: 'Product not found' };
  return { title: `${product.name} — SwiftCart`, description: product.description };
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProductById(id);
  if (!product) notFound();

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      <Navbar />
      <main className="flex-1 w-full pb-24 sm:pb-16 mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-8">
        <ProductDetailView product={product} mode="page" />
      </main>
    </div>
  );
}
