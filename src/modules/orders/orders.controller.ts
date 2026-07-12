import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { CheckoutOrderDto } from './dto/checkout-order.dto';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Orders')
@ApiBearerAuth('JWT')
@Controller('orders')
@UseGuards(JwtGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /**
   * Create a new order from cart items
   *
   * @param userId - Current user ID from JWT
   * @param createOrderDto - Order creation data with items
   * @returns Created order with items and total amount
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new order from cart items',
    description:
      'Create an order with one or more products. Price is snapshot at order time. Stock is NOT reduced until payment succeeds.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Order created successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request data',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'One or more products not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Insufficient stock for one or more products',
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  async createOrder(
    @CurrentUser('id') userId: string,
    @Body() createOrderDto: CreateOrderDto,
  ) {
    return this.ordersService.createOrder(userId, createOrderDto);
  }

  /**
   * Get order by ID
   *
   * @param userId - Current user ID from JWT (used for ownership check)
   * @param orderId - Order ID to fetch
   * @returns Order details with items and payments
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get order by ID',
    description:
      'Returns order details including items, total amount, and payment status. Ownership is verified.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Order retrieved successfully',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Order not found' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'You do not have permission to access this order',
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  async getOrderById(
    @CurrentUser('id') userId: string,
    @Param('id') orderId: string,
  ) {
    return this.ordersService.getOrderById(userId, orderId);
  }

  /**
   * Get current user's orders
   *
   * @param userId - Current user ID from JWT
   * @returns List of user's orders with items and payments
   */
  @Get()
  @ApiOperation({
    summary: "Get current user's orders",
    description:
      'Returns all orders placed by the authenticated user with items and payment status.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Orders retrieved successfully',
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  async getUserOrders(@CurrentUser('id') userId: string) {
    return this.ordersService.getUserOrders(userId);
  }

  /**
   * Initiate checkout for an order
   *
   * @param userId - Current user ID from JWT
   * @param orderId - Order ID to checkout
   * @param checkoutDto - Payment provider selection
   * @returns Payment details for client to complete payment
   */
  @Post(':id/checkout')
  @ApiOperation({
    summary: 'Initiate checkout for an order',
    description:
      'Start the payment process for a pending order. Returns provider-specific payment details (e.g., Stripe client_secret or bKash URL).',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Checkout initiated successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Order cannot be checked out (already paid or cancelled)',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Order not found' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'You do not have permission to access this order',
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  async checkoutOrder(
    @CurrentUser('id') userId: string,
    @Param('id') orderId: string,
    @Body() checkoutDto: CheckoutOrderDto,
  ) {
    return this.ordersService.checkoutOrder(userId, orderId, checkoutDto);
  }

  /**
   * Cancel an order (only if pending)
   *
   * @param userId - Current user ID from JWT
   * @param orderId - Order ID to cancel
   * @returns Updated order with CANCELED status
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancel an order (only if pending)',
    description:
      'Cancel a pending order. Cannot cancel orders that are already paid or cancelled.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Order cancelled successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Order cannot be cancelled (already paid or cancelled)',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Order not found' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'You do not have permission to cancel this order',
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  async cancelOrder(
    @CurrentUser('id') userId: string,
    @Param('id') orderId: string,
  ) {
    return this.ordersService.cancelOrder(userId, orderId);
  }

  /**
   * Get all orders — Admin only
   */
  @Get('admin/all')
  @UseGuards(AdminGuard)
  @ApiOperation({
    summary: 'Get all orders — Admin only',
    description:
      'Returns a paginated list of all orders across all users. Supports filtering by status.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['PENDING', 'PAID', 'CANCELED'],
    description: 'Filter by order status',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'All orders retrieved' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Admin access required',
  })
  async getAllOrders(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('status') status?: string,
  ) {
    return this.ordersService.getAllOrders({
      page: +page,
      limit: +limit,
      status,
    });
  }
}
