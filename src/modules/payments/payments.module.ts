import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { PaymentsController } from './controllers/payments.controller';
import { PaymentsService } from './services/payments.service';
import { StripeStrategy } from './strategies/stripe.strategy';
import { BkashStrategy } from './strategies/bkash.strategy';
import { ProviderRegistry } from './strategies/provider-registry';

/**
 * Payments Module
 *
 * Provides:
 * - Payment provider strategies (Stripe, bKash)
 * - Payment creation and management
 * - Webhook handlers with idempotency
 * - Payment queries and status tracking
 *
 * Adding a new provider:
 * 1. Implement PaymentProviderStrategy interface
 * 2. Add strategy to ProviderRegistry
 * 3. Add to providers array below
 * 4. Add environment variables to .env.example
 */
@Module({
  imports: [ConfigModule, HttpModule, PrismaModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, StripeStrategy, BkashStrategy, ProviderRegistry],
  exports: [PaymentsService],
})
export class PaymentsModule {}
