import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export const ATTENDANCE_TEST_MESSAGE =
  'رسالة اختبار من WhatsOrder. لو وصلتك يبقى الإرسال شغال.';

@Injectable()
export class WhatsAppClient {
  private readonly logger = new Logger(WhatsAppClient.name);

  async sendText(phone: string, text: string): Promise<unknown> {
    const token = process.env.WASEL_API_TOKEN?.trim();
    const instanceId = process.env.WASEL_INSTANCE_ID?.trim();
    if (!token || !instanceId) {
      throw new Error('WhatsApp API is not configured');
    }

    const formattedPhone = phone.replace(/\D/g, '');

    try {
      const response = await axios.post(
        `https://api.wapilot.net/api/v2/${instanceId}/send-message`,
        {
          chat_id: `${formattedPhone}@c.us`,
          text,
        },
        {
          headers: {
            token,
            'Content-Type': 'application/json',
          },
        },
      );

      this.logger.log(
        `WA-Pilot send-message ${response.status} ${JSON.stringify(response.data).slice(0, 300)}`,
      );
      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const detail = error.response?.data;
        const message =
          typeof detail === 'string'
            ? detail
            : JSON.stringify(detail ?? error.message);
        this.logger.error(`WA-Pilot send-message failed: ${message}`);
        throw new Error(message);
      }

      throw error;
    }
  }
}
