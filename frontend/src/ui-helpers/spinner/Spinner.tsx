import styles from './Spinner.css';

const Spinner = () => (
    <div className={styles['spinner-container']}>
        <div className={styles['spinner']}></div>
    </div>
);

export default Spinner;
