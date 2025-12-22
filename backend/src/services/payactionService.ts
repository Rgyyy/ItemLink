import axios from 'axios';

interface PayActionConfig {
  apiKey: string;
  mallId: string;
  apiUrl: string;
}

interface PayActionOrderRequest {
  order_number: string;
  order_amount: number;
  order_date: string;
  billing_name: string;
  orderer_name: string;
  orderer_phone_number?: string;
  orderer_email?: string;
  trade_usage?: '소득공제용' | '지출증빙용';
  identity_number?: string;
}

interface PayActionOrderResponse {
  status: 'success' | 'error';
  response: {
    message?: string;
    [key: string]: any;
  };
}

export class PayActionService {
  private config: PayActionConfig;

  constructor(config: PayActionConfig) {
    this.config = config;
  }

  /**
   * PayAction에 주문을 등록합니다.
   * 사용자가 입금 요청을 생성하면 이 메서드를 호출하여 PayAction에 주문을 등록합니다.
   */
  async createOrder(request: PayActionOrderRequest): Promise<PayActionOrderResponse> {
    try {
      const response = await axios.post<PayActionOrderResponse>(
        this.config.apiUrl,
        request,
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.config.apiKey,
            'x-mall-id': this.config.mallId
          },
          timeout: 30000
        }
      );

      return response.data;
    } catch (error) {
      console.error('PayAction create order error:', error);

      if (axios.isAxiosError(error) && error.response) {
        return error.response.data as PayActionOrderResponse;
      }

      throw new Error(
        `Failed to create PayAction order: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * 주문 번호를 생성합니다.
   * PayAction 권장사항: 22자 이하
   */
  generateOrderNumber(depositRequestId: string): string {
    const timestamp = Date.now().toString();
    const shortId = depositRequestId.substring(0, 8);
    return `${shortId}-${timestamp}`;
  }

  /**
   * ISO 8601 형식의 주문 일시를 생성합니다.
   * 형식: YYYY-MM-DDTHH:MM:SS+09:00
   */
  formatOrderDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+09:00`;
  }

  /**
   * 전화번호를 PayAction 형식으로 변환합니다.
   * 하이픈(-) 및 국가코드(+82) 제거
   * 예: 010-1234-5678 -> 01012345678
   */
  formatPhoneNumber(phoneNumber: string): string {
    return phoneNumber.replace(/[-\s+]/g, '').replace(/^82/, '0');
  }
}

export function createPayActionService(): PayActionService {
  const config: PayActionConfig = {
    apiKey: process.env.PAYACTION_API_KEY || '',
    mallId: process.env.PAYACTION_MALL_ID || '',
    apiUrl: process.env.PAYACTION_API_URL || 'https://api.payaction.app/order'
  };

  if (!config.apiKey || !config.mallId) {
    throw new Error(
      'PayAction configuration is missing. Check environment variables (PAYACTION_API_KEY, PAYACTION_MALL_ID).'
    );
  }

  return new PayActionService(config);
}
