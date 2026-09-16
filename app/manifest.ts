import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'My Chicken Addis',
    short_name: 'ChickenAddis',
    description: 'A streamlined communication platform for poultry farmers and trainers.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0284c7',
    icons: [
      { src: '/icon', sizes: 'any', type: 'image/svg+xml' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/svg+xml' },
    ],
  };
}
