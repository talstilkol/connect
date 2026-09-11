import type { PostgresPaddleRepository } from "../platform/postgresPaddleRepository.ts";
import type { PaddleEnvironment, PaddleProvider } from "./paddleProtocol.ts";
export function createPaddleWorker(journal: PostgresPaddleRepository, provider: PaddleProvider, environment: PaddleEnvironment) {
  return { async run(stopping: () => boolean = () => false) {
    if (stopping()) return;
    const intent = await journal.claimCreation(environment);
    if (intent) {
      try {
        const receipt = await provider.createTransaction(intent, async () => !stopping() && await journal.authorizeCreation(intent));
        await journal.confirmCreation(intent, receipt);
      } catch (error) { await journal.creationUnknown(intent); throw error; }
    }
    if (stopping()) return;
    const work = await journal.claimReconciliation(environment); if (!work) return;
    const payment = await provider.getTransaction(work.transactionId, work);
    if (payment.status !== "completed" || !payment.subscriptionId || stopping()) return;
    const subscription = await provider.getSubscription(payment.subscriptionId, work);
    await journal.applyReconciliation(work, payment, subscription);
  } };
}
