export function logger(message: string, error: boolean) {
    if (error) {
        console.error(`[ERROR] ${message}`);
    } else {
        console.log(`[INFO] ${message}`);
    }

}