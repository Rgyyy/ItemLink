"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import Button from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { GAME_CATEGORIES } from "@/constants/games";

interface Trade {
  id: string;
  title: string;
  description: string;
  gameCategory: string;
  tradeType: "SELL" | "BUY";
  server?: string;
  status: string;
  createdAt: string;
  seller: {
    id: string;
    username: string;
    tier: string;
    rating?: {
      totalSales: number;
      totalReviews: number;
      averageRating: number;
    };
  };
}

function HomeContent() {
  const { isAuthenticated } = useAuth();
  const searchParams = useSearchParams();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(""); // 입력 중인 검색어
  const [actualSearchTerm, setActualSearchTerm] = useState(""); // 실제 검색에 사용되는 검색어
  const [gameFilter, setGameFilter] = useState("");
  const [tradeTypeFilter, setTradeTypeFilter] = useState("");
  const [sellerFilter, setSellerFilter] = useState("");
  const [hideCompletedTrades, setHideCompletedTrades] = useState(false);

  const fetchTradesWithParams = async (
    game: string,
    type: string,
    seller: string
  ) => {
    try {
      setLoading(true);
      const params: any = { boardType: "TRADE", limit: 50 };
      if (game) params.gameCategory = game;
      if (type) params.tradeType = type;
      if (seller) params.sellerId = seller;

      console.log("Fetching trades with params:", params);
      const response: any = await api.getTrades(params);
      console.log("Trades received:", response.data?.trades?.length);
      setTrades(response.data?.trades || []);
    } catch (error) {
      console.error("Failed to fetch trades:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrades = () => {
    fetchTradesWithParams(gameFilter, tradeTypeFilter, sellerFilter);
  };

  // Load hideCompletedTrades setting from localStorage on mount
  useEffect(() => {
    const savedHideSetting = localStorage.getItem("hideCompletedTrades");
    if (savedHideSetting !== null) {
      setHideCompletedTrades(savedHideSetting === "true");
    }
  }, []);

  // URL 쿼리 파라미터에서 게임 필터 및 판매자 필터 읽기 및 데이터 로드
  useEffect(() => {
    const gameParam = searchParams.get("game");
    const sellerParam = searchParams.get("seller");
    const newGameFilter = gameParam || "";
    const newSellerFilter = sellerParam || "";
    console.log("Game param from URL:", gameParam);
    console.log("Seller param from URL:", sellerParam);
    setGameFilter(newGameFilter);
    setSellerFilter(newSellerFilter);

    // 검색어 초기화 (로고나 홈 클릭 시)
    if (!gameParam && !sellerParam) {
      setSearchTerm("");
      setActualSearchTerm("");
    }

    // URL 파라미터가 변경되면 즉시 데이터 fetch
    fetchTradesWithParams(newGameFilter, tradeTypeFilter, newSellerFilter);
  }, [searchParams, tradeTypeFilter]);

  // 드롭다운에서 gameFilter를 직접 변경했을 때만 데이터 로드
  const handleGameFilterChange = (newGameFilter: string) => {
    setGameFilter(newGameFilter);
    fetchTradesWithParams(newGameFilter, tradeTypeFilter, sellerFilter);
  };

  const handleTradeTypeFilterChange = (newTradeTypeFilter: string) => {
    setTradeTypeFilter(newTradeTypeFilter);
    fetchTradesWithParams(gameFilter, newTradeTypeFilter, sellerFilter);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setActualSearchTerm(searchTerm); // 실제 검색어 업데이트
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    setActualSearchTerm("");
  };

  const filteredTrades = trades.filter((trade) => {
    // Search term filter
    const matchesSearch =
      actualSearchTerm === "" ||
      trade.title.toLowerCase().includes(actualSearchTerm.toLowerCase()) ||
      trade.description.toLowerCase().includes(actualSearchTerm.toLowerCase());

    // Completed trades filter
    const matchesCompletedFilter =
      !hideCompletedTrades || trade.status !== "CLOSED";

    return matchesSearch && matchesCompletedFilter;
  });

  const getSellerUsername = () => {
    if (!sellerFilter || filteredTrades.length === 0) return null;
    return filteredTrades[0]?.seller?.username;
  };

  const clearSellerFilter = () => {
    setSellerFilter("");
    window.history.pushState({}, "", "/");
    fetchTradesWithParams(gameFilter, tradeTypeFilter, "");
  };

  const toggleHideCompletedTrades = () => {
    const newValue = !hideCompletedTrades;
    setHideCompletedTrades(newValue);
    localStorage.setItem("hideCompletedTrades", String(newValue));
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Search and Filter Section */}
      <section className="bg-white border-b py-4">
        <div className="container mx-auto px-4">
          <form
            onSubmit={handleSearch}
            className="flex flex-col md:flex-row gap-3 items-center"
          >
            {/* 검색어 입력 박스 (버튼 포함) */}
            <div className="relative w-full md:w-80">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="검색어를 입력하세요..."
                className="w-full pl-3 pr-24 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSearch(e as any);
                  }
                }}
              />
              <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1">
                {searchTerm && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="px-2 py-1 text-xs font-medium text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                    title="초기화"
                  >
                    ✕
                  </button>
                )}
                <button
                  type="submit"
                  className="px-3 py-1 text-xs font-medium text-white bg-blue-200 hover:bg-blue-300 rounded transition-colors"
                  title="검색"
                >
                  🔍
                </button>
              </div>
            </div>
            <select
              value={gameFilter}
              onChange={(e) => handleGameFilterChange(e.target.value)}
              className="px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-auto"
            >
              <option value="">전체 게임</option>
              {GAME_CATEGORIES.map((game) => (
                <option key={game} value={game}>
                  {game}
                </option>
              ))}
            </select>
            <select
              value={tradeTypeFilter}
              onChange={(e) => handleTradeTypeFilterChange(e.target.value)}
              className="px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-auto"
            >
              <option value="">전체</option>
              <option value="SELL">팝니다</option>
              <option value="BUY">삽니다</option>
            </select>

            {/* Hide Completed Trades Checkbox */}
            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 hover:text-gray-900 whitespace-nowrap">
              <input
                type="checkbox"
                checked={hideCompletedTrades}
                onChange={toggleHideCompletedTrades}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
              />
              <span>거래완료 글 숨기기</span>
            </label>

            <div className="md:ml-auto">
              {isAuthenticated && (
                <Link href="/trades/new">
                  <Button
                    variant="primary"
                    className="whitespace-nowrap text-sm w-full md:w-auto"
                  >
                    + 글쓰기
                  </Button>
                </Link>
              )}
            </div>
          </form>

          {sellerFilter && (
            <div className="mt-3 flex items-center gap-2 text-sm">
              <span className="text-gray-700">
                판매자 <strong>{getSellerUsername()}</strong>의 거래 글만 표시
                중
              </span>
              <button
                onClick={clearSellerFilter}
                className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded transition-colors"
              >
                필터 해제
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Trade List Section */}
      <section className="py-3">
        <div className="container mx-auto px-4">
          {loading ? (
            <div className="text-center py-8 text-gray-500">로딩 중...</div>
          ) : filteredTrades.length > 0 ? (
            <>
              {/* PC: List View */}
              <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700">
                        구분
                      </th>
                      <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700">
                        게임
                      </th>
                      <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 w-1/2">
                        제목
                      </th>
                      <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700">
                        ID
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredTrades.map((trade) => {
                      const getTierInKorean = (tier: string) => {
                        const tierMap: Record<string, string> = {
                          NEWBIE: "뉴비",
                          NORMAL: "일반",
                          TRUSTED: "신뢰",
                          VETERAN: "베테랑",
                          EXPERT: "전문가",
                        };
                        return tierMap[tier] || tier;
                      };

                      return (
                        <tr
                          key={trade.id}
                          className={`hover:bg-gray-50 transition-colors ${
                            trade.status === "CLOSED" ? "opacity-60" : ""
                          }`}
                        >
                          <td className="px-3 py-2">
                            <Link href={`/trades/${trade.id}`}>
                              <div className="flex gap-1 flex-wrap">
                                <span
                                  className={`px-2 py-1 text-xs font-semibold rounded ${
                                    trade.tradeType === "SELL"
                                      ? "bg-blue-100 text-blue-800"
                                      : "bg-green-100 text-green-800"
                                  }`}
                                >
                                  {trade.tradeType === "SELL"
                                    ? "팝니다"
                                    : "삽니다"}
                                </span>
                                {trade.status === "CLOSED" && (
                                  <span className="px-2 py-1 text-xs font-semibold rounded bg-gray-100 text-gray-800">
                                    거래완료
                                  </span>
                                )}
                              </div>
                            </Link>
                          </td>
                          <td className="px-3 py-2">
                            <Link href={`/trades/${trade.id}`}>
                              <span className="text-sm font-bold text-gray-800">
                                {trade.gameCategory}
                              </span>
                            </Link>
                          </td>
                          <td className="px-3 py-2">
                            <Link href={`/trades/${trade.id}`}>
                              <p className="font-semibold text-sm text-gray-900 line-clamp-1">
                                {trade.title}
                              </p>
                            </Link>
                          </td>
                          <td className="px-3 py-2">
                            <Link href={`/?seller=${trade.seller.id}`}>
                              <p className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors">
                                {trade.seller.username}
                              </p>
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile: Card View */}
              <div className="md:hidden grid gap-4">
                {filteredTrades.map((trade) => {
                  const getTierInKorean = (tier: string) => {
                    const tierMap: Record<string, string> = {
                      NEWBIE: "뉴비",
                      NORMAL: "일반",
                      TRUSTED: "신뢰",
                      VETERAN: "베테랑",
                      EXPERT: "전문가",
                    };
                    return tierMap[tier] || tier;
                  };

                  return (
                    <Card
                      key={trade.id}
                      className={`hover:shadow-lg transition-shadow ${
                        trade.status === "CLOSED" ? "opacity-60" : ""
                      }`}
                    >
                      <CardBody>
                        <Link href={`/trades/${trade.id}`}>
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex gap-2 flex-wrap">
                              <span
                                className={`px-2 py-1 text-xs font-semibold rounded ${
                                  trade.tradeType === "SELL"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-green-100 text-green-800"
                                }`}
                              >
                                {trade.tradeType === "SELL"
                                  ? "팝니다"
                                  : "삽니다"}
                              </span>
                              {trade.status === "CLOSED" && (
                                <span className="px-2 py-1 text-xs font-semibold rounded bg-gray-100 text-gray-800">
                                  거래완료
                                </span>
                              )}
                            </div>
                            <span className="text-sm font-bold text-gray-800">
                              {trade.gameCategory}
                            </span>
                          </div>
                          <h3 className="font-semibold text-lg mb-2 line-clamp-2">
                            {trade.title}
                          </h3>
                        </Link>
                        <div className="flex items-center justify-between border-t pt-3">
                          <Link
                            href={`/?seller=${trade.seller.id}`}
                            className="hover:text-blue-600"
                          >
                            <p className="text-sm font-medium text-gray-900">
                              ID: {trade.seller.username}
                            </p>
                          </Link>
                        </div>
                      </CardBody>
                    </Card>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              등록된 거래가 없습니다.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">로딩 중...</div>
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
