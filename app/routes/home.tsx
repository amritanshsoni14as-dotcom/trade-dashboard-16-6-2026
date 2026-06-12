import styles from "./home.module.css";


export default function HomePage() {
    return (
        <div className={styles.container}>
            <h1>Trade Accountant</h1>

            <p>
                Welcome to the dashboard.
            </p>
        </div>
    );
}
