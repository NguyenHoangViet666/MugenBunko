import db, { initializeDbConnection } from './dist/db.js';

async function main() {
    try {
        await initializeDbConnection();
        const list = await db.query("SELECT id, title, cover FROM novels");
        console.log("Danh sách truyện và cover:", list);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
main();
