import { notFound } from 'next/navigation';
import { getProductById } from '@/features/product/application/getProductById';
import ProductDetailModal from '@/features/product/presentation/ProductDetailModal';

export default async function InterceptedProductModal({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProductById(id);
  if (!product) notFound();

  return <ProductDetailModal product={product} />;
}
