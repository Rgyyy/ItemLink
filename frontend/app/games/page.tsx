'use client';

import Link from 'next/link';
import { Card, CardBody } from '@/components/ui/Card';
import { GAMES } from '@/constants/games';

export default function GamesPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">게임 목록</h1>
        <p className="text-gray-600">거래 가능한 게임을 선택하세요</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {GAMES.map((game) => (
          <Link key={game.id} href={`/?game=${encodeURIComponent(game.name)}`}>
            <Card className="hover:shadow-xl transition-all cursor-pointer hover:scale-105">
              <CardBody className="text-center p-6">
                <div className="mb-4 h-32 flex items-center justify-center rounded-lg overflow-hidden bg-gray-100">
                  <div className="text-4xl">🎮</div>
                </div>
                <h3 className="text-xl font-bold mb-2">{game.name}</h3>
                <p className="text-sm text-gray-500">{game.description}</p>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
