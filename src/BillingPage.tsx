import { useEntitlement } from "./EntitlementContext";

export default function BillingPage() {
  const { configured, pro, state, purchase, restore } = useEntitlement();

  return (
    <section className="settings-page">
      <header className="page-heading">
        <div>
          <p className="context-line">Billing</p>
          <h1>SweepSign Pro</h1>
          <p>
            The Test Store entitlement removes SweepSign attribution from your
            signed-in live preview. Production customer links stay fail-closed
            until server verification is configured.
          </p>
        </div>
      </header>
      <section className="settings-card">
        <h2>{pro ? "Pro is active" : "Billing test boundary"}</h2>
        {!configured ? (
          <p>
            Test billing is unavailable in this build. Set
            NEXT_PUBLIC_REVENUECAT_PUBLIC_API_KEY for a RevenueCat Web Billing
            Test Store.
          </p>
        ) : (
          <>
            <p>
              Checkout products and any price are supplied by your RevenueCat
              offering. SweepSign does not display invented pricing.
            </p>
            <button
              className="primary-button"
              type="button"
              onClick={() => void purchase()}
            >
              Open test checkout
            </button>
            <button
              className="quiet-button"
              type="button"
              onClick={() => void restore()}
            >
              Restore purchases
            </button>
          </>
        )}
        {state === "success" && (
          <p role="status">
            Test entitlement active. The signed-in live preview now omits the
            SweepSign attribution.
          </p>
        )}
        {state === "cancelled" && (
          <p role="status">
            Checkout was cancelled or no purchase was available to restore.
          </p>
        )}
        {state === "error" && (
          <p role="alert">
            Billing could not be reached. Your handoffs still work.
          </p>
        )}
      </section>
    </section>
  );
}
