export class AddToCartDto {
  productId!: string;
  quantity?: number;
}

export class UpdateCartItemDto {
  quantity!: number;
}

export class SyncCartDto {
  items!: Array<{ productId: string; quantity: number }>;
}
