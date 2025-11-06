import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function setSocialMedia() {
  console.log('🔗 Setting up social media links...');

  try {
    // Upsert social media settings
    const social = await prisma.setting.upsert({
      where: { key: 'social' },
      update: {
        value: JSON.stringify({
          facebook: 'https://www.facebook.com/p/Monaghans-Bar-and-Grill-100063611261508/',
          instagram: 'https://www.instagram.com/explore/locations/663499896/monaghans-bar-and-grill/',
        }),
        description: 'Social media links',
      },
      create: {
        key: 'social',
        value: JSON.stringify({
          facebook: 'https://www.facebook.com/p/Monaghans-Bar-and-Grill-100063611261508/',
          instagram: 'https://www.instagram.com/explore/locations/663499896/monaghans-bar-and-grill/',
        }),
        description: 'Social media links',
      },
    });

    console.log('✅ Social media links set successfully!');
    console.log('Facebook:', JSON.parse(social.value).facebook);
    console.log('Instagram:', JSON.parse(social.value).instagram);
  } catch (error) {
    console.error('❌ Error setting social media:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

setSocialMedia();

