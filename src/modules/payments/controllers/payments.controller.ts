import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Req,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiBody,
} from '@nestjs/swagger';
import { PaymentProvider } from '@prisma/client';
import { PaymentsService } from '../services/payments.service';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import {
  PaymentResponseDto,
  CreatePaymentResponseDto,
} from '../dto/payment-response.dto';
import { JwtGuard } from '../../auth/guards/jwt.guard';
import { Public } from '../../auth/decorators/public.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

/**
 * Payments Controller
 *
 * Handles:
 * - Payment creation (authenticated)
 * - Webhook endpoints (public, signature verified)
 * - Payment queries (authenticated)
 */
@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * Create a payment for an order
   */
  @Post()
  @UseGuards(JwtGuard)
  @ApiOperation({ summary: 'Create a payment for an order' })
  @ApiResponse({
    status: 201,
    description: 'Payment created successfully',
    type: CreatePaymentResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @ApiResponse({ status: 409, description: 'Payment already exists' })
  async createPayment(
    @Body() createPaymentDto: CreatePaymentDto,
    @CurrentUser('id') userId: string,
  ): Promise<{ success: boolean; message: string; data: PaymentResponseDto }> {
    const payment = await this.paymentsService.createPayment(
      createPaymentDto,
      userId,
    );

    const response: PaymentResponseDto = {
      id: payment.id,
      orderId: payment.orderId,
      provider: payment.provider,
      providerTxnId: payment.providerTxnId || undefined,
      amount: payment.amount,
      status: payment.status,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };

    // Parse raw response for provider-specific data
    const rawResponse = payment.getParsedRawResponse();
    if (rawResponse) {
      if (
        payment.provider === PaymentProvider.STRIPE &&
        rawResponse.clientSecret
      ) {
        response.clientSecret = rawResponse.clientSecret;
      } else if (
        payment.provider === PaymentProvider.BKASH &&
        rawResponse.bkashURL
      ) {
        response.bkashURL = rawResponse.bkashURL;
      }
    }

    return {
      success: true,
      message: 'Payment created successfully',
      data: response,
    };
  }

  /**
   * Stripe webhook endpoint
   *
   * CRITICAL:
   * - Raw body required for signature verification
   * - Signature verification prevents fraudulent webhooks
   * - Idempotent handler (retries are safe)
   * - Returns 200 even on error (to prevent retries)
   */
  @Public()
  @Post('stripe/webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stripe webhook endpoint' })
  @ApiHeader({
    name: 'stripe-signature',
    description: 'Stripe webhook signature',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook processed (or error logged)',
  })
  async handleStripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ): Promise<void> {
    this.logger.log('Received Stripe webhook');

    if (!req.rawBody) {
      this.logger.error('Missing raw body in Stripe webhook');
      return;
    }

    try {
      await this.paymentsService.processWebhook(
        PaymentProvider.STRIPE,
        req.rawBody,
        signature,
      );
    } catch (error) {
      this.logger.error(`Stripe webhook processing failed: ${error.message}`);
      // Return 200 to prevent retries (error already logged)
    }
  }

  /**
   * bKash callback endpoint
   *
   * CRITICAL:
   * - Raw body required for parsing
   * - Payment status verified by querying bKash API (never trust callback)
   * - Idempotent handler (retries are safe)
   * - Returns 200 even on error (to prevent retries)
   */
  @Public()
  @Post('bkash/callback')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'bKash callback endpoint' })
  @ApiBody({ description: 'bKash callback data' })
  @ApiResponse({
    status: 200,
    description: 'Callback processed (or error logged)',
  })
  async handleBkashCallback(
    @Req() req: RawBodyRequest<Request>,
  ): Promise<void> {
    this.logger.log('Received bKash callback');

    if (!req.rawBody) {
      this.logger.error('Missing raw body in bKash callback');
      return;
    }

    try {
      await this.paymentsService.processWebhook(
        PaymentProvider.BKASH,
        req.rawBody,
        '', // bKash doesn't use signature verification
      );
    } catch (error) {
      this.logger.error(`bKash callback processing failed: ${error.message}`);
      // Return 200 to prevent retries (error already logged)
    }
  }

  /**
   * Get payment details by ID
   */
  @Get(':paymentId')
  @UseGuards(JwtGuard)
  @ApiOperation({ summary: 'Get payment details' })
  @ApiResponse({ status: 200, description: 'Payment details retrieved' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async getPayment(@Param('paymentId') paymentId: string): Promise<{
    success: boolean;
    message: string;
    data: PaymentResponseDto;
  }> {
    const payment = await this.paymentsService.getPayment(paymentId);

    return {
      success: true,
      message: 'Payment retrieved successfully',
      data: {
        id: payment.id,
        orderId: payment.orderId,
        provider: payment.provider,
        providerTxnId: payment.providerTxnId || undefined,
        amount: payment.amount,
        status: payment.status,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
      },
    };
  }

  /**
   * Get payments for an order
   */
  @Get('order/:orderId')
  @UseGuards(JwtGuard)
  @ApiOperation({ summary: 'Get payments for an order' })
  @ApiResponse({ status: 200, description: 'Order payments retrieved' })
  async getPaymentsForOrder(@Param('orderId') orderId: string): Promise<{
    success: boolean;
    message: string;
    data: PaymentResponseDto[];
  }> {
    const payments = await this.paymentsService.getPaymentsForOrder(orderId);

    const data: PaymentResponseDto[] = payments.map((payment) => ({
      id: payment.id,
      orderId: payment.orderId,
      provider: payment.provider,
      providerTxnId: payment.providerTxnId || undefined,
      amount: payment.amount,
      status: payment.status,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    }));

    return {
      success: true,
      message: 'Order payments retrieved successfully',
      data,
    };
  }
}
