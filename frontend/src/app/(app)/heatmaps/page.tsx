import { getHeatmapScreens } from '@/lib/api';
import HeatmapViewer from '@/components/heatmaps/HeatmapViewer';

interface Props {
  searchParams: Promise<{ screen?: string }>;
}

export const revalidate = 0;

export default async function HeatmapsPage({ searchParams }: Props) {
  const params = await searchParams;

  let screens: string[] = [];
  try {
    screens = await getHeatmapScreens(30);
  } catch {
    // API not available
  }

  const selected = params.screen ?? screens[0] ?? '';

  return (
    <HeatmapViewer screens={screens} initialScreen={selected} />
  );
}
