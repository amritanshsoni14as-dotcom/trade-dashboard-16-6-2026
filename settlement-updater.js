const BASE_URL =
    "https://manika-mam-02-06-2026-one.vercel.app/api/api-settlement";

async function runSettlement() {

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
    runSettlement,
    2000
);