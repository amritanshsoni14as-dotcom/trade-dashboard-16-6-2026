const BASE_URL =
    "https://manika-mam-02-06-2026-one.vercel.app/api/live-price-update";

async function updateLivePrices() {

    try {

        const response =
            await fetch(BASE_URL);

        const data =
            await response.json();

        console.log(data);

    } catch (error) {

        console.error(error);
    }
}

setInterval(
    updateLivePrices,
    2000
);