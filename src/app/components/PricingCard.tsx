"use client"; // Necesario para usar useState y useEffect

import styles from "../styles/PricingCard.module.css";

interface PricingCardProps {
  plan: string;
  price: string;
  features: string[];
  buttonText: string;
  onBuy?: () => void;
  disabled?: boolean;
}

export default function PricingCard({
  plan,
  price,
  features,
  buttonText,
  onBuy,
  disabled = false,
}: PricingCardProps) {
  const isCustomPlan = plan === "Personalizado";
  const isPremiumPlan = plan === "Premium";
  const isBasicoPlan = plan === "Básico";

  return (
    <div
      className={`
        ${styles["pricing-card"]}
        ${isCustomPlan ? styles.customCard : ""}
        ${isPremiumPlan ? styles.premiumBorder : ""}
        ${isBasicoPlan ? styles.basicoBorder : ""}
      `}
    >
      {isCustomPlan && <div className={styles.premiumTag}>🔹 Plan a medida</div>}

      <h2 className={styles["card-plan"]}>{plan}</h2>
      <p className={styles["card-price"]}>{price}</p>

      <ul className={styles["card-features"]}>
        {features.map((feature, index) => (
          <li key={index} className={styles["card-feature"]}>
            {feature}
          </li>
        ))}
      </ul>

      <button
        className={`
          ${styles["card-button"]}
          ${isCustomPlan ? styles.contactButton : ""}
          ${disabled ? styles["card-button-disabled"] : ""}
        `}
        disabled={disabled}
        onClick={!disabled ? onBuy : undefined}
      >
        {buttonText}
      </button>
    </div>
  );
}
