import db from './db.js';

async function check() {
    try {
        await db.initializeDbConnection();
        const results = await db.query<any[]>("SELECT id, title, order_index FROM \`rules\`");
        console.log("RULES SEEDED:", JSON.stringify(results, null, 2));
    } catch (err) {
        console.error("Error during check:", err);
    }
    process.exit(0);
}

check();
