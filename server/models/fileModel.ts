import { z } from 'zod';

export const FileModelSchema = z.object({
  name: z.string(),
  creationDate: z.instanceof(Date),
  lastModifiedDate: z.instanceof(Date),
  size: z.number(),
});
