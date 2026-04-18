import { fromPairs } from 'lodash';
import { Inject, Injectable } from '@nestjs/common';
import { getSubscription } from '@lemonsqueezy/lemonsqueezy.js';
import { PromisePool } from '@supercharge/promise-pool';
import { GetSubscriptionsTransformer } from './GetSubscriptionsTransformer';
import { configureLemonSqueezy } from '../utils';
import { TransformerInjectable } from '@/modules/Transformer/TransformerInjectable.service';
import { PlanSubscription } from '../models/PlanSubscription';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';

@Injectable()
export class GetSubscriptionsService {
  constructor(
    private readonly transformer: TransformerInjectable,
    private readonly tenancyContext: TenancyContext,

    @Inject(PlanSubscription.name)
    private readonly planSubscriptionModel: typeof PlanSubscription,
  ) {}

  /**
   * Retrieve all subscription of the given tenant.
   * @param {number} tenantId
   */
  public async getSubscriptions() {
    const tenant = await this.tenancyContext.getTenant();
    const subscriptions = await this.planSubscriptionModel
      .query()
      .where('tenant_id', tenant.id)
      .withGraphFetched('plan');

    const lemonSubscriptions = await this.getLemonSubscriptions(subscriptions);

    return this.transformer.transform(
      subscriptions,
      new GetSubscriptionsTransformer(),
      {
        lemonSubscriptions,
      },
    );
  }

  /**
   * Self-hosted installs can run without Lemon Squeezy configured.
   */
  private async getLemonSubscriptions(subscriptions: InstanceType<typeof PlanSubscription>[]) {
    const hasLemonConfig =
      !!process.env.LEMONSQUEEZY_API_KEY &&
      !!process.env.LEMONSQUEEZY_STORE_ID &&
      !!process.env.LEMONSQUEEZY_WEBHOOK_SECRET;

    if (!hasLemonConfig) {
      return {};
    }

    configureLemonSqueezy();

    const lemonSubscriptionsResult = await PromisePool.withConcurrency(1)
      .for(subscriptions)
      .process(async (subscription) => {
        if (!subscription.lemonSubscriptionId) {
          return;
        }

        const res = await getSubscription(subscription.lemonSubscriptionId);

        if (res.error) {
          return;
        }
        return [subscription.lemonSubscriptionId, res.data];
      });

    return fromPairs(
      lemonSubscriptionsResult?.results.filter((result) => !!result?.[1]) ?? [],
    );
  }
}
