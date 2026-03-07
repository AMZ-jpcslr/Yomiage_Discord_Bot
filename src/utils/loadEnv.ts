import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

/**
 * Loads local .env for development only.
 *
 * On Railway (and most hosted environments), environment variables are injected
 * by the platform, so we should not depend on a checked-in .env file.
 */
export function loadEnv(): void {
    const isRailway =
        process.env.RAILWAY === 'true' ||
        !!process.env.RAILWAY_ENVIRONMENT ||
        !!process.env.RAILWAY_PROJECT_ID

    if (isRailway) return

    const envPath = path.resolve(process.cwd(), '.env')
    if (!fs.existsSync(envPath)) return

    dotenv.config({ path: envPath })
}
