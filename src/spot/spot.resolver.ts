import { Mutation, Query, Resolver } from '@nestjs/graphql';
import { SpotBalanceDto } from '../dtos/spot-balance.dto';
import { SpotService } from './spot.service';

@Resolver((of) => SpotBalanceDto)
export class SpotResolver {

  @Query((returns) => SpotBalanceDto)
  spotBalance() {
    return {};
  }
}
