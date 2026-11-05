import { z } from 'zod';
import { AppError } from '../../utils/errors.js';

const sleep = (milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
type Payload = Record<string, unknown>;

// These safe demo processors validate useful payload shapes without needing external credentials.
export async function processJob(type: string, payload: Payload) {
  switch (type) {
    case 'email': {
      const data = z.object({ to: z.string().email(), subject: z.string().min(1), message: z.string().min(1) }).parse(payload);
      await sleep(50);
      return { deliveredTo: data.to, subject: data.subject };
    }
    case 'report': {
      const data = z.object({ reportName: z.string().min(1), rows: z.number().int().nonnegative().optional() }).parse(payload);
      await sleep(100);
      return { report: data.reportName, generatedRows: data.rows ?? 0 };
    }
    case 'notification': {
      const data = z.object({ recipient: z.string().min(1), message: z.string().min(1) }).parse(payload);
      await sleep(30);
      return { notified: data.recipient };
    }
    case 'default':
      await sleep(20);
      return { processed: true };
    default:
      throw new AppError(400, `Unsupported job type: ${type}`);
  }
}
