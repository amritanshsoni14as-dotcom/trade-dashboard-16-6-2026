const BASE_URL =
    "https://manika-mam-02-06-2026-one.vercel.app/api/live-price-update";

async function updateLivePrices() {

    const now = new Date();
    const formatted = now.toLocaleString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    }).replace(',', '');

    // console.log(`[${formatted}]`); 
    // Output: [24/05/2024 14:30:05]

    try {

        const response =
            await fetch(BASE_URL);

        const data =
            await response.json();

        console.log(`[${formatted}]`, data);

    } catch (error) {

        console.error(`[${formatted}]`, error);
    }
}

setInterval(
    updateLivePrices,
    2000
);