import { z } from 'zod';
import { SupportedChainId } from '../../../types';

const getNetworkFeeSchema = z.record(
  z.union([
    z.nativeEnum(SupportedChainId).transform((val) => val.toString()),

    z.literal('3'),
    z.literal('5'),
    z.literal('80001'),
  ]),
  z.string()
);

export default getNetworkFeeSchema;
