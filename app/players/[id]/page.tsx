import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getBootstrapData, getPlayerDetail } from "@/lib/fpl-server";
import type { PlayerDetailData } from "@/lib/fpl-server";
import { getPositionLabel, formatPrice } from "@/lib/fpl-utils";
import PlayerDetailClient from "./PlayerDetailClient";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const playerId = Number(id);
  if (isNaN(playerId) || playerId <= 0) {
    return { title: "Player Not Found" };
  }

  try {
    const data = await getBootstrapData();
    const player = data.elements.find(p => p.id === playerId);

    if (!player) {
      return { title: "Player Not Found" };
    }

    const team = data.teams.find(t => t.id === player.team);
    const position = getPositionLabel(player.element_type);
    const price = formatPrice(player.now_cost);
    const teamName = team?.name || '';

    const title = `${player.web_name}`;
    const description = `${player.first_name} ${player.second_name} | ${teamName} ${position} | ${price} | ${player.total_points} pts | Form ${player.form} | Owned by ${player.selected_by_percent}%`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: "profile",
        images: [
          {
            url: `https://resources.premierleague.com/premierleague/photos/players/110x140/p${player.photo?.replace('.jpg', '')}.png`,
            width: 110,
            height: 140,
            alt: `${player.first_name} ${player.second_name}`,
          },
        ],
      },
      twitter: {
        card: "summary",
        title,
        description,
      },
    };
  } catch {
    return { title: "Player" };
  }
}

export default async function PlayerPage({ params }: Props) {
  const { id } = await params;
  const playerId = Number(id);

  if (isNaN(playerId) || playerId <= 0) {
    notFound();
  }

  // Fetch bootstrap (for 404 check) + player detail in PARALLEL
  let initialDetail: PlayerDetailData | null = null;
  try {
    const [data, detail] = await Promise.all([
      getBootstrapData(),
      getPlayerDetail(playerId),
    ]);
    const player = data.elements.find(p => p.id === playerId);
    if (!player) notFound();
    initialDetail = detail;
  } catch {
    // If server fetch fails, let the client handle it
  }

  return <PlayerDetailClient playerId={playerId} initialDetail={initialDetail} />;
}
