import { pathToFileURL } from 'node:url';
import { runPaymentLedgerAudit } from './ledgerAudit.js';

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    try {
        const report = await runPaymentLedgerAudit();
        console.log(JSON.stringify(report, null, 2));
        process.exitCode = report.valid ? 0 : 2;
    } catch (error) {
        const code = (error as { code?: unknown })?.code;
        console.error('Payment ledger audit failed.', typeof code === 'string' && /^[A-Z0-9_]{1,64}$/.test(code)
            ? code : 'CHECK_DATABASE_CONFIGURATION');
        process.exitCode = 1;
    }
}
