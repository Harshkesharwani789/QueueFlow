import { describe, expect, it } from 'vitest';
import { priorityValue } from '../../src/modules/queues/priorities.js';

describe('BullMQ priority mapping', () => {
  it('assigns lower BullMQ values to higher business priorities', () => {
    expect(priorityValue.CRITICAL).toBeLessThan(priorityValue.HIGH);
    expect(priorityValue.HIGH).toBeLessThan(priorityValue.NORMAL);
    expect(priorityValue.NORMAL).toBeLessThan(priorityValue.LOW);
  });
});
