// BullMQ uses lower numeric values for higher priority; keeping it pure makes the policy easy to test.
export const priorityValue = { CRITICAL: 1, HIGH: 2, NORMAL: 3, LOW: 4 } as const;
