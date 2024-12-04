import { z } from 'zod';
import { SupportedChainId } from '../../../types';

const getNetworkFeeSchema = z.record(
  z.nativeEnum(SupportedChainId).transform((val) => val.toString()),
  z.string()
);

export default getNetworkFeeSchema;
