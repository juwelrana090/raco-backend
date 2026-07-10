import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PaymentProvider, Order as PrismaOrder } from '@prisma/client';
import { PaymentProviderStrategy } from '../interfaces/payment-provider-strategy.interface';
import type { ProviderPaymentHandle, PaymentResult, WebhookEvent } from '../dto/provider-payment-handle.dto';

@Injectable()
export class BkashStrategy implements PaymentProviderStrategy {
  private readonly logger = new Logger(BkashStrategy.name);
  private readonly baseUrl: string;
  private readonly appKey: string;
  private readonly appSecret: string;
  private readonly username: string;
  private readonly password: string;
  private readonly callbackUrl: string;

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {
    this.baseUrl = this.configService.get('BKASH_BASE_URL') || '';
    this.appKey = this.configService.get('BKASH_APP_KEY') || '';
    this.appSecret = this.configService.get('BKASH_APP_SECRET') || '';
    this.username = this.configService.get('BKASH_USERNAME') || '';
    this.password = this.configService.get('BKASH_PASSWORD') || '';
    this.callbackUrl = this.configService.get('BKASH_CALLBACK_URL') || '';
  }

  getProvider(): PaymentProvider {
    return PaymentProvider.BKASH;
  }

  async createPayment(order: PrismaOrder): Promise<ProviderPaymentHandle> {
    try {
      this.logger.log(`Creating bKash payment for order: ${order.id}`);

      // Get token
      const token = await this.getToken();

      // Create payment
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/checkout/create`,
          {
            mode: '0011',
            currency: 'BDT',
            amount: order.totalAmount.toString(),
            intent: 'sale',
            merchantInvoiceNumber: order.id,
            callbackURL: this.callbackUrl,
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: token,
              'X-APP-KEY': this.appKey,
            },
          },
        ),
      );

      const paymentData = response.data;

      if (paymentData.statusCode !== '0000') {
        throw new HttpException(
          `bKash payment creation failed: ${paymentData.statusMessage}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      this.logger.log(`bKash payment created: ${paymentData.paymentID}`);

      return {
        provider: PaymentProvider.BKASH,
        providerPaymentId: paymentData.paymentID,
        providerData: paymentData,
        checkoutUrl: paymentData.bkashURL,
        amount: order.totalAmount,
        status: 'pending',
      };
    } catch (error) {
      this.logger.error(`bKash payment creation error: ${error.message}`);
      throw new HttpException(
        'Failed to create bKash payment',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async confirmPayment(
    handle: ProviderPaymentHandle,
  ): Promise<PaymentResult> {
    try {
      this.logger.log(`Confirming bKash payment: ${handle.providerPaymentId}`);

      // Get token
      const token = await this.getToken();

      // Query payment status from bKash
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/checkout/execute`,
          {
            paymentID: handle.providerPaymentId,
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: token,
              'X-APP-KEY': this.appKey,
            },
          },
        ),
      );

      const paymentData = response.data;

      this.logger.log(`bKash payment status: ${JSON.stringify(paymentData)}`);

      if (paymentData.statusCode === '0000' && paymentData.transactionStatus === 'Completed') {
        return {
          success: true,
          providerTxnId: paymentData.trxID,
          rawResponse: paymentData,
          status: 'success',
        };
      } else if (paymentData.transactionStatus === 'Failed' || paymentData.transactionStatus === 'Cancelled') {
        return {
          success: false,
          providerTxnId: paymentData.trxID || null,
          rawResponse: paymentData,
          status: 'failed',
          errorMessage: paymentData.statusMessage,
        };
      } else {
        return {
          success: false,
          providerTxnId: null,
          rawResponse: paymentData,
          status: 'pending',
        };
      }
    } catch (error) {
      this.logger.error(`bKash payment confirmation error: ${error.message}`);
      throw new HttpException(
        'Failed to confirm bKash payment',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async queryPayment(transactionId: string): Promise<PaymentResult> {
    try {
      this.logger.log(`Querying bKash payment: ${transactionId}`);

      // Get token
      const token = await this.getToken();

      // Query payment status
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/checkout/payment/status`,
          {
            paymentID: transactionId,
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: token,
              'X-APP-KEY': this.appKey,
            },
          },
        ),
      );

      const paymentData = response.data;

      this.logger.log(`bKash payment query result: ${JSON.stringify(paymentData)}`);

      return {
        success: paymentData.transactionStatus === 'Completed',
        providerTxnId: paymentData.trxID,
        rawResponse: paymentData,
        status: paymentData.transactionStatus === 'Completed' ? 'success' : 'pending',
      };
    } catch (error) {
      this.logger.error(`bKash payment query error: ${error.message}`);
      throw new HttpException(
        'Failed to query bKash payment',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async verifyWebhook(rawBody: Buffer, signature: string): Promise<WebhookEvent> {
    try {
      this.logger.log('Verifying bKash webhook/callback');

      // Parse callback data
      const data = JSON.parse(rawBody.toString());

      this.logger.log(`bKash callback data: ${JSON.stringify(data)}`);

      // Return webhook event structure
      return {
        type: data.status || 'payment.update',
        providerTxnId: data.trxID || data.paymentID,
        data: data,
        rawEvent: data,
      };
    } catch (error) {
      this.logger.error(`bKash webhook verification error: ${error.message}`);
      throw new HttpException(
        'Invalid bKash webhook',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async getToken(): Promise<string> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/checkout/token/grant`,
          {
            app_key: this.appKey,
            app_secret: this.appSecret,
          },
          {
            headers: {
              'Content-Type': 'application/json',
              username: this.username,
              password: this.password,
            },
            auth: {
              username: this.username,
              password: this.password,
            },
          },
        ),
      );

      const tokenData = response.data;

      if (tokenData.statusCode !== '0000') {
        throw new Error(`bKash token generation failed: ${tokenData.statusMessage}`);
      }

      return tokenData.id_token;
    } catch (error) {
      this.logger.error(`bKash token generation error: ${error.message}`);
      throw error;
    }
  }
}
