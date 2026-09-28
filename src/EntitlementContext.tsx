import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { BillingState, RevenueCatBilling } from "./billing";

type EntitlementContextValue = {
  configured: boolean;
  pro: boolean;
  state: BillingState;
  purchase: () => Promise<void>;
  restore: () => Promise<void>;
};

const EntitlementContext = createContext<EntitlementContextValue>({
  configured: false,
  pro: false,
  state: "unavailable",
  purchase: async () => undefined,
  restore: async () => undefined,
});

export function EntitlementProvider({
  userId,
  children,
}: {
  userId: string;
  children: ReactNode;
}) {
  const apiKey = process.env.NEXT_PUBLIC_REVENUECAT_PUBLIC_API_KEY;
  const configured = Boolean(apiKey?.startsWith("test_"));
  const billingRef = useRef<RevenueCatBilling | null>(null);
  const [state, setState] = useState<BillingState>(
    configured ? "ready" : "unavailable",
  );
  const [pro, setPro] = useState(false);

  useEffect(() => {
    let current = true;
    if (!configured || !apiKey || !userId) return;
    void import("./billing")
      .then(({ RevenueCatBilling }) => {
        const billing = new RevenueCatBilling(apiKey);
        billingRef.current = billing;
        return billing.connect(userId);
      })
      .then((active) => {
        if (current) setPro(active);
      })
      .catch(() => {
        if (current) setState("error");
      });
    return () => {
      current = false;
    };
  }, [apiKey, configured, userId]);

  const purchase = async () => {
    const next = (await billingRef.current?.presentPaywall()) ?? "unavailable";
    setState(next);
    if (next === "success") setPro(true);
  };
  const restore = async () => {
    const next = (await billingRef.current?.restore()) ?? "unavailable";
    setState(next);
    if (next === "success" && billingRef.current)
      setPro(await billingRef.current.connect(userId));
  };

  return (
    <EntitlementContext.Provider
      value={{ configured, pro, state, purchase, restore }}
    >
      {children}
    </EntitlementContext.Provider>
  );
}

// This paired hook intentionally lives beside its single provider.
// eslint-disable-next-line react-refresh/only-export-components
export const useEntitlement = () => useContext(EntitlementContext);
