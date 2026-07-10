import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentProvider } from '@prisma/client';
import { PaymentProviderStrategy } from '../interfaces/payment-provider-strategy.interface';
import { StripeStrategy } from './stripe.strategy';
import { BkashStrategy } from './bkash.strategy';

/**
 * Payment Provider Registry
 *
 * Factory for payment provider strategies.
 * Adding a new provider = add class to registry (zero changes to PaymentService).
 */
@Injectable()
export class ProviderRegistry {
  private readonly logger = new Logger(ProviderRegistry.name);
  private strategies: Map<PaymentProvider, PaymentProviderStrategy> = new Map();

  constructor(
    private config: ConfigService,
    private stripeStrategy: StripeStrategy,
    private bkashStrategy: BkashStrategy,
  ) {
    this.registerStrategies();
  }

  /**
   * Register all available payment providers
   *
   * To add a new provider:
   * 1. Implement PaymentProviderStrategy interface
   * 2. Inject strategy here
   * 3. Add to strategies map below
   */
  private registerStrategies(): void {
    this.strategies.set(PaymentProvider.STRIPE, this.stripeStrategy);
    this.strategies.set(PaymentProvider.BKASH, this.bkashStrategy);

    this.logger.log(`Registered ${this.strategies.size} payment providers`);
  }

  /**
   * Get strategy for provider
   *
   * @param provider - Payment provider enum
   * @returns Payment provider strategy
   * @throws Error if provider not found
   */
  getStrategy(provider: PaymentProvider): PaymentProviderStrategy {
    const strategy = this.strategies.get(provider);

    if (!strategy) {
      throw new Error(`No strategy found for provider: ${provider}`);
    }

    return strategy;
  }

  /**
   * Check if provider is supported
   */
  isSupported(provider: PaymentProvider): boolean {
    return this.strategies.has(provider);
  }

  /**
   * Get all supported providers
   */
  getSupportedProviders(): PaymentProvider[] {
    return Array.from(this.strategies.keys());
  }
}
