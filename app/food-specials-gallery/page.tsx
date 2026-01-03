import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { FaUtensils, FaArrowLeft } from 'react-icons/fa';
import FoodSpecialsGallery from '@/components/food-specials-gallery';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function FoodSpecialsGalleryPage() {
  // Fetch all active food specials that have images
  const foodSpecials = await prisma.special.findMany({
    where: {
      type: 'food',
      isActive: true,
      image: {
        not: null,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Filter out any specials with empty image strings
  const specialsWithImages = foodSpecials
    .filter((special) => special.image && special.image.trim() !== '')
    .map((special) => ({
      id: special.id,
      title: special.title,
      description: special.description,
      priceNotes: special.priceNotes,
      timeWindow: special.timeWindow,
      image: special.image!,
    }));

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black pt-20 pb-16 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 md:mb-12">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-white/70 hover:text-white transition mb-4 group"
          >
            <FaArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>Back to Home</span>
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-orange-600/70 rounded-lg">
              <FaUtensils className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white">
              Food Specials Gallery
            </h1>
          </div>
          <p className="text-gray-300 text-lg mt-2">
            Explore our delicious food specials
          </p>
        </div>

        {/* Gallery Grid */}
        <FoodSpecialsGallery specials={specialsWithImages} />
      </div>
    </main>
  );
}

