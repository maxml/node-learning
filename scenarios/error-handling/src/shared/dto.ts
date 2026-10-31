import { IsEmail, IsInt, Min } from 'class-validator';

export class RegisterCustomerDto {
  @IsEmail() email!: string;
}

export class PlaceOrderDto {
  @IsInt() @Min(1) customerId!: number;
  @IsInt() @Min(1) amount!: number;
}
