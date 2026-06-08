const BASE_URL =
    "http://localhost:5173/api/api-settlement";

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