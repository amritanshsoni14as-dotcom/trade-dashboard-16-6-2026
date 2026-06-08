const BASE_URL =
    "http://localhost:5173/api/live-price-update";

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