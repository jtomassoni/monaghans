import { PrismaClient } from '@prisma/client';
import { existsSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

async function fixTacoPlatter() {
  try {
    // Find all food specials with "Taco Platter" in the title
    const tacoPlatters = await prisma.special.findMany({
      where: {
        title: {
          contains: 'Taco Platter',
        },
        type: 'food',
      },
      select: {
        id: true,
        title: true,
        image: true,
        isActive: true,
      },
    });

    console.log(`Found ${tacoPlatters.length} Taco Platter special(s):\n`);

    const correctPath = '/pics/food-specials/taco-platter.png';
    const correctImagePath = join(process.cwd(), 'public', correctPath.substring(1));
    const imageExists = existsSync(correctImagePath);

    if (!imageExists) {
      console.log(`❌ Image not found at: ${correctPath}`);
      console.log('Please ensure the image exists before running this script.');
      return;
    }

    for (const special of tacoPlatters) {
      console.log(`Special: ${special.title}`);
      console.log(`  Current image: ${special.image || '(none)'}`);
      console.log(`  Active: ${special.isActive}`);

      // Check if current image path is invalid
      let needsUpdate = false;
      if (!special.image || special.image.trim() === '') {
        console.log(`  ⚠️  No image set - will update to: ${correctPath}`);
        needsUpdate = true;
      } else {
        const currentImagePath = special.image.startsWith('/')
          ? join(process.cwd(), 'public', special.image.substring(1))
          : join(process.cwd(), 'public', special.image);
        const currentExists = existsSync(currentImagePath);
        if (!currentExists) {
          console.log(`  ❌ Current image path is invalid (file doesn't exist)`);
          console.log(`  ✅ Will update to: ${correctPath}`);
          needsUpdate = true;
        } else if (special.image !== correctPath) {
          console.log(`  ⚠️  Image exists but path is different`);
          console.log(`  ✅ Will update to: ${correctPath}`);
          needsUpdate = true;
        } else {
          console.log(`  ✅ Image path is already correct!`);
        }
      }

      if (needsUpdate) {
        await prisma.special.update({
          where: { id: special.id },
          data: { image: correctPath },
        });
        console.log(`  ✅ Updated successfully!\n`);
      } else {
        console.log('');
      }
    }
  } catch (error) {
    console.error('Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixTacoPlatter()
  .then(() => {
    console.log('✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });

