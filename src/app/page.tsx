import { getProducts } from '@/features/catalog/application/getProducts';
import CatalogGrid from '@/features/catalog/presentation/CatalogGrid';
import Navbar from '@/features/catalog/presentation/Navbar';

export const revalidate = 60;

export default async function HomePage() {
  const products = await getProducts();

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans selection:bg-black selection:text-white">
      <Navbar />
      <main className="flex-1 w-full pb-24 sm:pb-16">
        <CatalogGrid initialProducts={products} />
      </main>
    </div>
  );
}
